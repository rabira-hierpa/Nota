// Built-in Hohe on a real phone or emulator: accuracy, speed and memory on
// clips with known text. Prints numbers only, never text.
//
// Put the four model files in the app's models folder and the clips in an
// `eval` folder beside it (16 kHz mono 16-bit WAVs plus refs.json, a list of
// {"file", "text"}). On Android, after installing the app once:
//   adb push <models>/. /sdcard/Android/data/com.rzcodes.nota/files/models/
//   adb push <eval>/. /sdcard/Android/data/com.rzcodes.nota/files/eval/
// then `flutter test integration_test/hohe_eval_test.dart -d <device> --no-uninstall`
// (uninstalling deletes that folder, models and all). `--dart-define=NOTA_EVAL_CLIPS=10`
// scores only the first 10.
// Scoring is quant/fleurs.py's: Ge'ez homophones folded, punctuation dropped.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/hohe/recognizer.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

const _punctuation = '።፣፤፥፦፧፨፠፡!?.,;:\'"()[]-«»“”‘’…/';

/// ሐ and ኀ as ሀ, ሠ as ሰ, ዐ as አ, ፀ as ጸ (seven vowel orders each), and ኣ as አ.
final Map<int, int> _fold = () {
  final fold = <int, int>{0x12A3: 0x12A0};
  for (final (from, to) in [(0x1210, 0x1200), (0x1280, 0x1200), (0x1220, 0x1230), (0x12D0, 0x12A0), (0x1340, 0x1338)]) {
    for (var order = 0; order < 7; order++) {
      fold[from + order] = to + order;
    }
  }
  return fold;
}();

String _normalise(String text) {
  final buffer = StringBuffer();
  for (final rune in text.runes) {
    buffer.writeCharCode(_punctuation.runes.contains(rune) ? 0x20 : _fold[rune] ?? rune);
  }
  return buffer.toString().split(RegExp(r'\s+')).where((word) => word.isNotEmpty).join(' ');
}

int _editDistance<T>(List<T> a, List<T> b) {
  var previous = List<int>.generate(b.length + 1, (i) => i);
  for (var i = 1; i <= a.length; i++) {
    final current = List<int>.filled(b.length + 1, i);
    for (var j = 1; j <= b.length; j++) {
      final substitution = previous[j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1);
      current[j] = [previous[j] + 1, current[j - 1] + 1, substitution].reduce((x, y) => x < y ? x : y);
    }
    previous = current;
  }
  return previous[b.length];
}

Future<Directory> _base() async =>
    Platform.isAndroid ? (await getExternalStorageDirectory())! : await getApplicationDocumentsDirectory();

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  test('built-in Hohe transcribes the eval clips', () async {
    final base = await _base();
    final models = p.join(base.path, 'models');
    final refsFile = File(p.join(base.path, 'eval', 'refs.json'));
    if (!refsFile.existsSync()) {
      markTestSkipped('no eval clips in ${refsFile.parent.path}');
      return;
    }
    final refs = (jsonDecode(await refsFile.readAsString()) as List<Object?>).cast<Map<String, Object?>>();
    const limit = int.fromEnvironment('NOTA_EVAL_CLIPS');
    final clips = limit > 0 && limit < refs.length ? refs.sublist(0, limit) : refs;

    final loading = Stopwatch()..start();
    final hohe = await Hohe.load(models);
    final punctuator = await Punctuator.load(models);
    loading.stop();

    var charErrors = 0, chars = 0, wordErrors = 0, words = 0, audioSamples = 0, sentenceEnds = 0;
    final transcribing = Stopwatch();
    final punctuating = Stopwatch();
    for (final (index, clip) in clips.indexed) {
      final wav = readWav(await File(p.join(base.path, 'eval', clip['file']! as String)).readAsBytes());
      final samples = switch (wav) {
        Ok(:final value) => value,
        Err(:final message) => fail('clip $index: $message'),
      };
      audioSamples += samples.length;
      transcribing.start();
      final text = await hohe.transcribe(samples);
      transcribing.stop();
      if (index < 10) {
        punctuating.start();
        final punctuated = await punctuator.punctuate(text);
        punctuating.stop();
        sentenceEnds += '።?'.runes.fold(0, (sum, mark) => sum + punctuated.runes.where((r) => r == mark).length);
      }
      final reference = clip['text']! as String;
      final hypothesis = _normalise(text);
      charErrors += _editDistance(reference.runes.toList(), hypothesis.runes.toList());
      chars += reference.runes.length;
      wordErrors += _editDistance(reference.split(' '), hypothesis.split(' '));
      words += reference.split(' ').length;
    }
    await hohe.release();
    await punctuator.release();

    final audioSeconds = audioSamples / sampleRate;
    final seconds = transcribing.elapsedMilliseconds / 1000;
    // ignore: avoid_print
    print(
      'clips ${clips.length}, audio ${audioSeconds.toStringAsFixed(1)} s, '
      'CER ${(100 * charErrors / chars).toStringAsFixed(2)}%, WER ${(100 * wordErrors / words).toStringAsFixed(2)}%, '
      'transcribed in ${seconds.toStringAsFixed(1)} s (${(seconds / audioSeconds).toStringAsFixed(3)} s per audio second), '
      'models loaded in ${loading.elapsedMilliseconds} ms, punctuation of 10 clips ${punctuating.elapsedMilliseconds} ms '
      'with $sentenceEnds sentence ends, peak memory ${(ProcessInfo.maxRss / 1048576).round()} MB',
    );
    expect(charErrors / chars, lessThan(0.1));
    expect(sentenceEnds, greaterThan(0));
  }, timeout: Timeout.none);
}
