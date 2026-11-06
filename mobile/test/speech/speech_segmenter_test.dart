import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/audio/speech_segmenter.dart';

const rate = 16000;

/// The desktop test's levels are on the float scale (-1…1); a 16-bit sample s is s / 32768 there.
const loud = 0.1;

Int16List sound(int ms, double level) {
  // Alternating signs: an RMS of `level`, like a steady voice.
  final sample = (level * 32768).round();
  return Int16List.fromList([for (var i = 0; i < rate * ms ~/ 1000; i++) i.isEven ? sample : -sample]);
}

Int16List speech(int ms) => sound(ms, loud);
Int16List silence(int ms) => Int16List(rate * ms ~/ 1000);

double seconds(Int16List? clip) => (clip?.length ?? 0) / rate;

Int16List concat(List<Int16List> parts) => Int16List.fromList([for (final part in parts) ...part]);

/// Feeds audio the way the record package streams it: 100 ms at a time.
List<Int16List> feed(SpeechSegmenter segmenter, Int16List audio) => [
  for (var offset = 0; offset < audio.length; offset += 1600)
    ...segmenter.push(Int16List.sublistView(audio, offset, (offset + 1600).clamp(0, audio.length))),
];

void main() {
  group('SpeechSegmenter', () {
    test('sends a stretch of speech as soon as the speaker pauses', () {
      final clips = feed(SpeechSegmenter(), concat([silence(1000), speech(1500), silence(800)]));

      expect(clips, hasLength(1));
      // A short lead-in, the speech, and the pause that ended it.
      expect(seconds(clips[0]), closeTo(0.3 + 1.5 + 0.5, 0.05));
    });

    test('keeps a sentence together through a short breath', () {
      final clips = feed(SpeechSegmenter(), concat([speech(600), silence(350), speech(600), silence(800)]));
      expect(clips, hasLength(1));
    });

    test('splits at each real pause', () {
      final clips = feed(SpeechSegmenter(), concat([speech(900), silence(800), speech(900), silence(800)]));
      expect(clips, hasLength(2));
    });

    test('never sends silence or a click', () {
      final segmenter = SpeechSegmenter();
      expect(feed(segmenter, concat([silence(3000), speech(60), silence(1000), silence(2000)])), isEmpty);
      expect(segmenter.flush(), isNull);
    });

    test('cuts speech that never pauses at its quietest moment', () {
      final segmenter = SpeechSegmenter();
      final dip = sound(300, 0.02); // quieter, but still speech
      final clips = feed(segmenter, concat([speech(17010), dip, speech(6000)]));

      expect(clips, hasLength(1));
      expect(seconds(clips[0]), greaterThan(17));
      expect(seconds(clips[0]), lessThan(17.4));
      expect(seconds(segmenter.flush()), greaterThan(5.5));
    });

    test('hands over the last words when the microphone stops mid-sentence', () {
      final segmenter = SpeechSegmenter();
      expect(feed(segmenter, speech(1010)), isEmpty);
      expect(seconds(segmenter.flush()), closeTo(1.01, 0.005));
    });

    test('keeps every sample of a clip, in order', () {
      final audio = concat([speech(900), silence(800)]);
      final clips = feed(SpeechSegmenter(), audio);
      expect(clips.single, audio.sublist(0, clips.single.length));
    });

    test('counts a level just under -40 dBFS as silence', () {
      // 0.0099 of full scale: below the float threshold of 0.01 once converted.
      final segmenter = SpeechSegmenter();
      expect(feed(segmenter, concat([sound(2000, 0.0099), silence(1000)])), isEmpty);
      expect(segmenter.flush(), isNull);
      expect(feed(SpeechSegmenter(), concat([sound(2000, 0.0101), silence(1000)])), hasLength(1));
    });
  });
}
