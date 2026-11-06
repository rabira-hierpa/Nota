import 'dart:math' as math;
import 'dart:typed_data';

import '../audio/wav.dart';

/// Where to look for a pause: the last 5 s of each window.
const _searchSamples = 5 * sampleRate;
const _frameSamples = sampleRate ~/ 10;

/// The 100 ms frame with the least energy among `frames` from `from`; the first on a tie.
int _quietestFrame(Int16List audio, int from, int frames) {
  var quietest = 0;
  var lowest = -1;
  for (var frame = 0; frame < frames; frame++) {
    var energy = 0;
    final start = from + frame * _frameSamples;
    for (var i = start; i < start + _frameSamples; i++) {
      energy += audio[i] * audio[i];
    }
    if (lowest < 0 || energy < lowest) {
      lowest = energy;
      quietest = frame;
    }
  }
  return quietest;
}

/// Pieces of at most `maxSeconds`, each cut in the middle of the quietest
/// 100 ms of its window's last 5 s, so words are rarely split. With 30 s, the
/// same cuts as the desktop (and `split_at_pauses` in its Python helper).
/// The pieces are views of `audio`, not copies.
List<Int16List> splitAtPauses(Int16List audio, {int maxSeconds = 30}) {
  if (maxSeconds < 1) throw ArgumentError.value(maxSeconds, 'maxSeconds', 'must be at least 1');
  final maxChunk = maxSeconds * sampleRate;
  // A window shorter than 5 s is searched whole.
  final search = math.min(_searchSamples, maxChunk);
  final pieces = <Int16List>[];
  var start = 0;
  while (audio.length - start > maxChunk) {
    final searchFrom = start + maxChunk - search;
    final cut =
        searchFrom + _quietestFrame(audio, searchFrom, search ~/ _frameSamples) * _frameSamples + _frameSamples ~/ 2;
    pieces.add(Int16List.sublistView(audio, start, cut));
    start = cut;
  }
  if (start < audio.length) pieces.add(Int16List.sublistView(audio, start));
  return pieces;
}
