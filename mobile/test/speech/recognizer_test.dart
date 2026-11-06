import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/hohe/model_files.dart';
import 'package:nota/features/speech/hohe/recognizer.dart';

// ONNX Runtime is a platform plugin and can't run here. These check that
// failures come out as generic SpeechModelExceptions, and talk to a fake of
// the plugin's channel (answering as its Android side does) to check the
// session options, the tensors sent and read, and that every one is freed.

Matcher failsWith(String message) =>
    throwsA(isA<SpeechModelException>().having((error) => error.message, 'message', message));

const _channel = MethodChannel('flutter_onnxruntime');

/// Hohe's tokens for the fake: blank, three letters and the word delimiter.
const _tokens = ['<pad>', 'ሰ', 'ላ', 'ም', '|'];

/// The plugin's native side, as far as Nota uses it.
final class _FakeOrt {
  _FakeOrt() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_channel, _handle);
  }

  final sessions = <String, Map<Object?, Object?>>{};
  final closed = <String>[];

  /// Values created and not yet released, by id.
  final live = <String, ({String type, List<int> shape, Object data})>{};
  final inputs = <({String type, List<int> shape, Object data})>[];

  /// What a run answers, by output name: (type, shape, data).
  Map<String, (String, List<int>, Object)> Function(String session) outputs = (_) => {};
  PlatformException? runError;
  var _next = 0;

  void dispose() =>
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_channel, null);

  Future<Object?> _handle(MethodCall call) async {
    final args = (call.arguments as Map<Object?, Object?>?) ?? const {};
    switch (call.method) {
      case 'createSession':
        final id = 'session${_next++}';
        sessions[id] = args['sessionOptions']! as Map<Object?, Object?>;
        return {'sessionId': id, 'inputNames': <String>[], 'outputNames': <String>[]};
      case 'createOrtValue':
        final value = (
          type: args['sourceType']! as String,
          shape: (args['shape']! as List<Object?>).cast<int>(),
          data: args['data']!,
        );
        inputs.add(value);
        return {'valueId': _store(value), 'dataType': value.type, 'shape': value.shape};
      case 'runInference':
        if (runError case final error?) throw error;
        return {
          for (final MapEntry(key: name, value: (type, shape, data)) in outputs(args['sessionId']! as String).entries)
            name: [_store((type: type, shape: shape, data: data)), type, shape],
        };
      case 'getOrtValueData':
        final value = live[args['valueId']]!;
        return {'data': value.data, 'shape': value.shape};
      case 'releaseOrtValue':
        live.remove(args['valueId']);
        return null;
      case 'closeSession':
        closed.add(args['sessionId']! as String);
        return null;
    }
    throw MissingPluginException(call.method);
  }

  String _store(({String type, List<int> shape, Object data}) value) {
    final id = 'value${_next++}';
    live[id] = value;
    return id;
  }
}

/// Logits that pick `ids` step by step.
Float32List _logits(List<int> ids) {
  final logits = Float32List(ids.length * _tokens.length);
  for (var t = 0; t < ids.length; t++) {
    logits[t * _tokens.length + ids[t]] = 5;
  }
  return logits;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory models;

  setUp(() => models = Directory.systemTemp.createTempSync('nota_models_'));
  tearDown(() => models.deleteSync(recursive: true));

  group('Hohe.load', () {
    test('says the model files are unreadable when they are missing', () {
      expect(Hohe.load(models.path), failsWith('Hohe could not load (model file unreadable)'));
    });

    test('says the model file is bad, never what is in it', () {
      File('${models.path}/${ModelFiles.hoheTokens}').writeAsStringSync('{"tokens": "secret words"}');
      expect(Hohe.load(models.path), failsWith('Hohe could not load (bad model file)'));
    });
  });

  group('Punctuator.load', () {
    test('says the model files are unreadable when they are missing', () {
      expect(Punctuator.load(models.path), failsWith('punctuation could not load (model file unreadable)'));
    });

    test('says the model file is bad, never what is in it', () {
      File('${models.path}/${ModelFiles.punctuationConfig}').writeAsStringSync('not json: secret words');
      expect(Punctuator.load(models.path), failsWith('punctuation could not load (bad model file)'));
    });
  });

  group('through the plugin', () {
    late _FakeOrt ort;

    setUp(() {
      ort = _FakeOrt();
      File('${models.path}/${ModelFiles.hoheTokens}')
          .writeAsStringSync(jsonEncode({'tokens': _tokens, 'blank': 0, 'wordDelimiter': '|'}));
      File('${models.path}/${ModelFiles.punctuationConfig}').writeAsStringSync(
        jsonEncode({
          'maxLength': 8,
          'postLabels': ['<NULL>', '.', '?'],
          'bos': 0,
          'eos': 2,
          'unk': 3,
          'specials': 4,
          'pieces': [
            ['<s>', 0],
            ['<pad>', 0],
            ['</s>', 0],
            ['<unk>', 0],
            ['▁a', -1],
            ['▁b', -1],
          ],
        }),
      );
    });
    tearDown(() => ort.dispose());

    test('opens sessions on the CPU, with the memory arena off and at most four threads', () async {
      final hohe = await Hohe.load(models.path);
      final options = ort.sessions.values.single;
      expect(options['providers'], ['CPU']);
      expect(options['useArena'], isFalse);
      expect(options['intraOpNumThreads'], allOf(greaterThanOrEqualTo(1), lessThanOrEqualTo(4)));
      expect(options['sessionConfigs'], {'session.use_device_allocator_for_initializers': '1'});
      await hohe.release();
      expect(ort.closed, ort.sessions.keys.toList());
    });

    test('sends float32 features, decodes the logits, and frees every tensor', () async {
      ort.outputs = (_) => {
        'logits': ('float32', [1, 6, _tokens.length], _logits([1, 1, 2, 0, 3, 4])),
      };
      final hohe = await Hohe.load(models.path);
      final progress = <double>[];
      // 25 s: two pieces of at most 20 s.
      final text = await hohe.transcribe(Int16List(25 * sampleRate), onProgress: progress.add);
      expect(text, 'ሰላም ሰላም');
      expect(ort.inputs, hasLength(2));
      for (final input in ort.inputs) {
        expect(input.type, 'float32');
        expect(input.data, isA<Float32List>());
        expect(input.shape, hasLength(3));
        expect(input.shape[2], 160);
        expect((input.data as Float32List).length, input.shape[1] * 160);
      }
      expect(progress.last, 1);
      expect(ort.live, isEmpty);
    });

    test('frees the input when a run fails, and says only the error code', () async {
      ort.runError = PlatformException(code: 'INFERENCE_ERROR', message: 'secret words');
      final hohe = await Hohe.load(models.path);
      await expectLater(
        hohe.transcribe(Int16List(sampleRate)),
        failsWith('Hohe could not transcribe (INFERENCE_ERROR)'),
      );
      expect(ort.inputs, hasLength(1));
      expect(ort.live, isEmpty);
    });

    test('refuses logits of an unexpected size, and still frees them', () async {
      ort.outputs = (_) => {
        'logits': ('float32', [1, 6, _tokens.length], Float32List(3)),
      };
      final hohe = await Hohe.load(models.path);
      await expectLater(
        hohe.transcribe(Int16List(sampleRate)),
        failsWith('Hohe could not transcribe (unexpected logits)'),
      );
      expect(ort.live, isEmpty);
    });

    test('sends int64 piece ids, reads both heads, and frees every output', () async {
      ort.outputs = (_) {
        final length = ort.inputs.last.shape[1];
        return {
          'pre_preds': ('int64', [1, length], Int64List(length)),
          'post_preds': ('int64', [1, length], Int64List.fromList(List.filled(length, 1))),
          'seg_preds': ('bool', [1, length], [for (var i = 0; i < length; i++) i == length - 2]),
        };
      };
      final punctuator = await Punctuator.load(models.path);
      expect(await punctuator.punctuate('a b'), 'a b።');
      final input = ort.inputs.single;
      expect(input.type, 'int64');
      expect(input.data, isA<Int64List>());
      expect(input.data, [0, 4, 5, 2]);
      expect(input.shape, [1, 4]);
      expect(ort.live, isEmpty);
      await punctuator.release();
      await punctuator.release();
      expect(ort.closed, hasLength(1));
    });

    test('a released model refuses to run, and frees what was made for it', () async {
      final hohe = await Hohe.load(models.path);
      await hohe.release();
      await expectLater(hohe.transcribe(Int16List(sampleRate)), failsWith('Hohe could not transcribe (released)'));
      expect(ort.live, isEmpty);
    });
  });
}
