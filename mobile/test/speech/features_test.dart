import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/hohe/features.dart';

import 'fixture.dart';

void main() {
  group('hoheFeatures', () {
    test("match transformers' SeamlessM4TFeatureExtractor, padding frame included", () {
      final fixture = readFixture('features.json');
      final samples = fromBase64(fixture['samples']).asInt16List();
      final expected = fromBase64(fixture['features']).asFloat32List();
      final (:data, :steps) = hoheFeatures(samples);

      expect([1, steps, featureSize], fixture['dims']);
      expect(data.length, expected.length);
      var largest = 0.0;
      for (var i = 0; i < data.length; i++) {
        largest = math.max(largest, (data[i] - expected[i]).abs());
      }
      expect(largest, lessThan(1e-4));
    });

    test('make one step per two frames', () {
      // Two frames exactly: 400 samples, then one more hop of 160.
      final samples = Int16List.fromList([for (var i = 0; i < minSamples; i++) (i % 7) * 100]);
      expect(hoheFeatures(samples).steps, 1);
    });

    test('pad an odd last frame with ones', () {
      // Three frames: two steps, the second half of the last one padding.
      final samples = Int16List.fromList([for (var i = 0; i < minSamples + 160; i++) (i % 11) * 50 - 250]);
      final (:data, :steps) = hoheFeatures(samples);
      expect(steps, 2);
      expect(data.sublist(featureSize + featureSize ~/ 2), everyElement(1.0));
    });

    test('refuse fewer samples than two frames need', () {
      expect(() => hoheFeatures(Int16List(minSamples - 1)), throwsArgumentError);
    });

    test('take well under real time on 20 s of audio', () {
      final random = math.Random(7);
      final samples = Int16List.fromList([for (var i = 0; i < 20 * sampleRate; i++) random.nextInt(8000) - 4000]);
      hoheFeatures(samples); // warm up
      final watch = Stopwatch()..start();
      final (:data, :steps) = hoheFeatures(samples);
      watch.stop();
      // ignore: avoid_print
      print('hoheFeatures on 20 s of audio: ${watch.elapsedMilliseconds} ms');
      expect(steps, 999);
      expect(data.length, steps * featureSize);
      expect(watch.elapsedMilliseconds, lessThan(2000));
    });
  });
}
