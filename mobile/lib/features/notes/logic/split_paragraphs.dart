import 'dart:math' as math;

import 'text_similarity.dart';

/// A paragraph shorter than this reads fine as it is.
const minSentencesToSplit = 6;

/// No paragraph is cut shorter than this.
const _minSentencesPerParagraph = 2;

/// Without clear changes of topic, paragraphs of about this many sentences.
const _fallbackSentencesPerParagraph = 4;

/// Sentences compared on each side of a gap.
const _window = 2;

/// How far below the average likeness a gap must dip to count as a change of topic, in standard deviations.
const _dip = 0.5;

/// How alike the sentences just before and just after each gap are (gap g sits before sentence g + 1).
List<double> _gapLikeness(List<String> sentences) => [
  for (var gap = 0; gap < sentences.length - 1; gap += 1)
    cosine(
      trigramVector(sentences.sublist(math.max(0, gap + 1 - _window), gap + 1).join(' ')),
      trigramVector(sentences.sublist(gap + 1, math.min(sentences.length, gap + 1 + _window)).join(' ')),
    ),
];

/// Gaps (index of the sentence a paragraph starts at) where the topic changes, lowest likeness first.
List<int> _topicBreaks(List<String> sentences) {
  final likeness = _gapLikeness(sentences);
  final mean = likeness.fold(0.0, (sum, value) => sum + value) / likeness.length;
  final variance = likeness.fold(0.0, (sum, value) => sum + (value - mean) * (value - mean)) / likeness.length;
  final spread = math.sqrt(variance);
  // Least alike first; on a tie the earlier gap (Dart's sort isn't stable, so say so).
  final byLikeness = List<int>.generate(likeness.length, (gap) => gap)
    ..sort((a, b) {
      final byValue = likeness[a].compareTo(likeness[b]);
      return byValue != 0 ? byValue : a - b;
    });
  final chosen = <int>[];
  for (final gap in byLikeness) {
    if (likeness[gap] > mean - _dip * spread) break;
    final start = gap + 1;
    final edges = [0, ...chosen, sentences.length];
    if (edges.every((edge) => (edge - start).abs() >= _minSentencesPerParagraph)) chosen.add(start);
  }
  return chosen..sort();
}

/// Even cuts, for a long stretch with no clear change of topic.
List<int> _evenBreaks(int count) {
  final parts = (count / _fallbackSentencesPerParagraph).ceil();
  final size = (count / parts).ceil();
  return [for (var part = 0; part < parts - 1; part += 1) (part + 1) * size];
}

/// One long paragraph (a transcript arrives as a single block) cut where the
/// topic changes: where the sentences on either side of a gap share the least.
/// Short paragraphs come back as they are.
List<String> splitIntoParagraphs(String paragraph) {
  final sentences = splitSentences(paragraph);
  if (sentences.length < minSentencesToSplit) return [paragraph.trim()];
  final found = _topicBreaks(sentences);
  final breaks = found.isNotEmpty ? found : _evenBreaks(sentences.length);
  final starts = [0, ...breaks];
  return [
    for (var index = 0; index < starts.length; index += 1)
      sentences.sublist(starts[index], index < breaks.length ? breaks[index] : sentences.length).join(' '),
  ];
}
