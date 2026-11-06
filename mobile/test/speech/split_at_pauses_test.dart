import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/hohe/split_at_pauses.dart';

/// Equally loud everywhere (every 100 ms has the same energy) except quiet stretches, [start, end) in seconds.
Int16List speech(int seconds, List<(double, double)> quiet) => Int16List.fromList([
  for (var i = 0; i < seconds * sampleRate; i++)
    quiet.any((range) => i / sampleRate >= range.$1 && i / sampleRate < range.$2) ? 0 : (i % 2) * 16000 - 8000,
]);

List<int> lengths(List<Int16List> pieces) => [for (final piece in pieces) piece.length];

int samples(double seconds) => (seconds * sampleRate).round();

void main() {
  group('splitAtPauses', () {
    test('leaves 30 s or less whole', () {
      final audio = speech(30, []);
      final pieces = splitAtPauses(audio);
      expect(lengths(pieces), [audio.length]);
      expect(pieces.single, audio);
    });

    test("cuts in the middle of the quietest 100 ms of each window's last 5 s", () {
      final pieces = splitAtPauses(speech(70, [(27.2, 27.3)]));
      // The first window's pause is at 27.2–27.3 s: cut at 27.25 s. The next window ends at 57.25 s
      // with no pause, so it cuts in the first frame of its search (52.25–52.35 s), at 52.30 s.
      expect(lengths(pieces), [samples(27.25), samples(25.05), samples(17.7)]);
    });

    test('keeps every sample, in order', () {
      final audio = speech(95, [(28, 28.5), (55, 55.2)]);
      final pieces = splitAtPauses(audio);
      expect(lengths(pieces).fold(0, (sum, length) => sum + length), audio.length);
      expect(pieces.every((piece) => piece.length <= 30 * sampleRate), isTrue);
      expect([for (final piece in pieces) ...piece], audio);
    });

    test('gives nothing for no audio', () {
      expect(splitAtPauses(Int16List(0)), isEmpty);
    });

    test('searches the last 5 s of shorter windows', () {
      final pieces = splitAtPauses(speech(45, [(17.0, 17.1)]), maxSeconds: 20);
      // The pause at 17.0–17.1 s sits in the first window's last 5 s (15–20 s): cut at 17.05 s. The next
      // window ends at 37.05 s with no pause: cut in the first frame of its search, at 32.10 s.
      expect(lengths(pieces), [samples(17.05), samples(15.05), samples(12.9)]);
      expect(pieces.every((piece) => piece.length <= 20 * sampleRate), isTrue);
    });

    test('gives views of the audio, not copies', () {
      final audio = speech(70, []);
      final pieces = splitAtPauses(audio);
      expect(pieces, hasLength(3));
      for (final piece in pieces) {
        expect(piece.buffer == audio.buffer, isTrue);
      }
      expect(pieces[1].offsetInBytes, pieces[0].length * Int16List.bytesPerElement);
    });
  });
}
