import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/services.dart' show PlatformException;
import 'package:flutter_onnxruntime/flutter_onnxruntime.dart';
import 'package:path/path.dart' as p;

import 'ctc.dart';
import 'features.dart';
import 'model_files.dart';
import 'punctuate.dart' as punctuation;
import 'sentencepiece.dart';
import 'split_at_pauses.dart';

/// A speech model failed to load or run. The message is generic: it never
/// holds note text, transcript text or audio, only what failed and the
/// platform's error code.
final class SpeechModelException implements Exception {
  const SpeechModelException(this.message);

  final String message;

  @override
  String toString() => 'SpeechModelException: $message';
}

/// Phones pair a few fast cores with slower ones; past four threads the work
/// lands on the slow cores and heats the phone for little gain.
const _maxThreads = 4;

/// Hohe's pieces are at most this long by default. Its attention grows with
/// the square of a piece's length (docs/embedded-speech.md, "Shorter
/// pieces": peak memory 3.4 GB at 30 s, 1.5 GB at 15 s), and phones have
/// little memory.
const _phonePieceSeconds = 20;

/// The CPU, and ONNX Runtime's memory arena off: the arena keeps the largest
/// piece's memory (about 3 GB after a 30 s piece) and grows by doubling, which
/// ended the desktop's worker on long recordings (docs/embedded-speech.md,
/// "The arena under Electron"); off, memory falls back to the model's size
/// between pieces. flutter_onnxruntime can't turn the arena off on iOS, so the
/// weights are at least kept out of it there, and the short pieces do the rest.
OrtSessionOptions _sessionOptions() => OrtSessionOptions(
  providers: [OrtProvider.CPU],
  intraOpNumThreads: math.max(1, math.min(_maxThreads, Platform.numberOfProcessors)),
  useArena: false,
  sessionConfigs: const {'session.use_device_allocator_for_initializers': '1'},
);

/// What to say about a failure: never an error's message, which could quote
/// anything the platform saw.
String _reason(Exception error) => switch (error) {
  SpeechModelException(:final message) => message,
  PlatformException(:final code) => code,
  FormatException() => 'bad model file',
  FileSystemException() => 'model file unreadable',
  _ => error.runtimeType.toString(),
};

/// Runs `body`, turning what it throws into a [SpeechModelException] that says only `failure` and why.
Future<T> _guarded<T>(String failure, Future<T> Function() body) async {
  try {
    return await body();
  } on Exception catch (error) {
    throw SpeechModelException('$failure (${_reason(error)})');
  }
}

Future<Map<String, Object?>> _readJson(String path) async {
  final decoded = jsonDecode(await File(path).readAsString());
  if (decoded is! Map<String, Object?>) throw const FormatException('not a JSON object');
  return decoded;
}

/// Frees native tensors. A failure here can't be acted on and must not hide the run's own error.
Future<void> _dispose(Iterable<OrtValue> values) async {
  for (final value in values) {
    try {
      await value.dispose();
    } on Exception {
      // Already gone with its session.
    }
  }
}

/// A float tensor's data: flutter_onnxruntime hands float32 back as a
/// Float32List (float16 as a Float32List on iOS, a list of doubles on Android).
Float32List _floats(List<Object?> values) {
  if (values is Float32List) return values;
  return Float32List.fromList([
    for (final value in values)
      if (value is num) value.toDouble() else throw const SpeechModelException('unexpected output type'),
  ]);
}

/// An integer or bool tensor's data: int64 comes back as an Int64List, int32
/// as an Int32List, int8 and uint8 as a Uint8List, bool as a list of bools.
List<int> _ints(List<Object?> values) {
  if (values is List<int>) return values;
  return [
    for (final value in values)
      switch (value) {
        final bool flag => flag ? 1 : 0,
        final num number => number.toInt(),
        _ => throw const SpeechModelException('unexpected output type'),
      },
  ];
}

/// One model's session. Runs go one at a time, and closing waits for the
/// running one, so a release never pulls the session from under a run; runs
/// still waiting when it closes fail instead.
final class _Session {
  _Session(this._session);

  final OrtSession _session;
  Future<void> _tail = Future<void>.value();
  bool _closed = false;

  /// Runs `inputs` once the runs before it are done, hands the outputs to
  /// `read`, then frees every tensor (they live in native memory).
  Future<T> run<T>(Map<String, OrtValue> inputs, Future<T> Function(Map<String, OrtValue> outputs) read) {
    final result = _tail.then((_) async {
      var outputs = <String, OrtValue>{};
      try {
        if (_closed) throw const SpeechModelException('released');
        outputs = await _session.run(inputs);
        return await read(outputs);
      } finally {
        await _dispose([...inputs.values, ...outputs.values]);
      }
    });
    _tail = result.then<void>((_) {}, onError: (Object _) {});
    return result;
  }

  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    await _tail;
    await _session.close();
  }
}

/// Hohe's features for a piece, computed on another isolate so the UI keeps
/// its frames. The piece crosses as transferable bytes: one copy, of the piece only.
Future<({Float32List data, int steps})> _featuresAside(Int16List piece) {
  final audio = TransferableTypedData.fromList([piece]);
  return Isolate.run(() => hoheFeatures(audio.materialize().asInt16List()));
}

/// Hohe: audio in, Amharic text out (no punctuation; it writes none).
/// Failures throw a [SpeechModelException].
class Hohe {
  Hohe._(this._session, this._vocabulary);

  static Future<Hohe> load(String modelsDir) => _guarded('Hohe could not load', () async {
    final vocabulary = CtcVocabulary.fromJson(await _readJson(p.join(modelsDir, ModelFiles.hoheTokens)));
    final session = await OnnxRuntime().createSession(p.join(modelsDir, ModelFiles.hohe), options: _sessionOptions());
    return Hohe._(_Session(session), vocabulary);
  });

  final _Session _session;
  final CtcVocabulary _vocabulary;

  /// The text of 16 kHz samples, cut at pauses into pieces of at most
  /// `maxPieceSeconds`. `onProgress` hears the share of the audio done after each piece.
  Future<String> transcribe(
    Int16List samples, {
    int maxPieceSeconds = _phonePieceSeconds,
    void Function(double done)? onProgress,
  }) => _guarded('Hohe could not transcribe', () async {
    final texts = <String>[];
    var done = 0;
    for (final piece in splitAtPauses(samples, maxSeconds: maxPieceSeconds)) {
      // Too short for two frames: a click at the end of a recording.
      if (piece.length >= minSamples) {
        final text = await _transcribePiece(piece);
        if (text.isNotEmpty) texts.add(text);
      }
      done += piece.length;
      onProgress?.call(done / samples.length);
    }
    return texts.join(' ');
  });

  /// One dictation clip's text. The segmenter already cuts clips at 20 s, so
  /// this only splits what is longer than that.
  Future<String> transcribeClip(Int16List samples) => transcribe(samples);

  /// Closes the session, once the running piece is done, and frees the
  /// model's memory. Safe to call twice.
  Future<void> release() => _guarded('Hohe could not close', _session.close);

  Future<String> _transcribePiece(Int16List piece) async {
    final features = await _featuresAside(piece);
    final input = await OrtValue.fromList(features.data, [1, features.steps, featureSize]);
    return _session.run({'input_features': input}, (outputs) async {
      final logits = outputs['logits'];
      if (logits == null || logits.shape.length != 3) throw const SpeechModelException('unexpected logits');
      final [_, steps, size] = logits.shape;
      final data = _floats(await logits.asFlattenedList());
      if (data.length != steps * size) throw const SpeechModelException('unexpected logits');
      return decodeCtc(bestTokens(data, steps, size), _vocabulary);
    });
  }
}

(punctuation.PunctuationConfig, UnigramTokenizer) _readPunctuation(String path) {
  final decoded = jsonDecode(File(path).readAsStringSync());
  if (decoded is! Map<String, Object?>) throw const FormatException('not a JSON object');
  final config = punctuation.PunctuationConfig.fromJson(decoded);
  return (config, UnigramTokenizer(config.table));
}

/// punct.json is 190 KB of word pieces: read and indexed on another isolate.
Future<(punctuation.PunctuationConfig, UnigramTokenizer)> _loadPunctuation(String path) =>
    Isolate.run(() => _readPunctuation(path));

/// Puts sentence ends back into Hohe's text. Failures throw a [SpeechModelException].
class Punctuator {
  Punctuator._(this._session, this._config, this._tokenizer);

  static Future<Punctuator> load(String modelsDir) => _guarded('punctuation could not load', () async {
    final (config, tokenizer) = await _loadPunctuation(p.join(modelsDir, ModelFiles.punctuationConfig));
    final session = await OnnxRuntime().createSession(
      p.join(modelsDir, ModelFiles.punctuation),
      options: _sessionOptions(),
    );
    return Punctuator._(_Session(session), config, tokenizer);
  });

  final _Session _session;
  final punctuation.PunctuationConfig _config;
  final UnigramTokenizer _tokenizer;

  /// `text` with full stops and question marks where the model puts them.
  Future<String> punctuate(String text) =>
      _guarded('punctuation failed', () => punctuation.punctuate(text, _tokenizer, _config, _run));

  /// Closes the session, once the running window is done, and frees the
  /// model's memory. Safe to call twice.
  Future<void> release() => _guarded('punctuation could not close', _session.close);

  Future<punctuation.WindowLabels> _run(List<int> ids) async {
    final input = await OrtValue.fromList(Int64List.fromList(ids), [1, ids.length]);
    return _session.run({'input_ids': input}, (outputs) async {
      final post = outputs['post_preds'];
      final seg = outputs['seg_preds'];
      if (post == null || seg == null) throw const SpeechModelException('unexpected labels');
      final labels = punctuation.WindowLabels(
        post: _ints(await post.asFlattenedList()),
        seg: _ints(await seg.asFlattenedList()),
      );
      if (labels.post.length != ids.length || labels.seg.length != ids.length) {
        throw const SpeechModelException('unexpected labels');
      }
      return labels;
    });
  }
}
