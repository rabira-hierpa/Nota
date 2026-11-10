import 'dart:math' as math;

import 'tags.dart';
import 'text_similarity.dart';

/// How a summary added to the note begins (ማጠቃለያ: summary), so it is found again and not summarized itself.
const summaryLabel = 'ማጠቃለያ፦';

/// Fewer sentences than this are their own summary.
const minSentencesToSummarize = 3;

/// A sentence this short ("እሺ።") says too little to stand for the note.
const _minWordsInSentence = 3;

/// About one sentence in five, between one and four.
const _sentencesPerSummarySentence = 5;
const _maxSummarySentences = 4;

/// A candidate this close to a sentence already picked would repeat it.
const _maxOverlap = 0.6;

/// TextRank's damping factor and iterations (it settles well before).
const _damping = 0.85;
const _iterations = 40;

/// Notes and talks tend to open with what they are about: the first sentences get a small lift.
const _leadBonus = 0.25;

/// The note's sentences that can stand for it: not the title line, not a line of tags, not one-word replies.
List<String> _candidates(String text) {
  final lines = [
    for (final line in text.split('\n'))
      if (line.trim().isNotEmpty) line.trim(),
  ];
  final body = lines.length > 1 ? lines.sublist(1) : lines;
  return [
    for (final line in body)
      if (!line.startsWith(summaryLabel) && !holdsOnlyTags(line))
        for (final sentence in splitSentences(line))
          if (wordsOf(sentence).length >= _minWordsInSentence) sentence,
  ];
}

/// Weighs each trigram by how rare it is across the note's sentences, so common endings count for less.
List<TermVector> _weighted(List<TermVector> vectors) {
  final documentFrequency = <String, int>{};
  for (final vector in vectors) {
    for (final term in vector.keys) {
      documentFrequency[term] = (documentFrequency[term] ?? 0) + 1;
    }
  }
  return [
    for (final vector in vectors)
      {
        for (final MapEntry(key: term, value: count) in vector.entries)
          term: count * math.log(1 + vectors.length / (documentFrequency[term] ?? 1)),
      },
  ];
}

/// TextRank: a sentence matters when sentences that matter are like it.
List<double> _rank(List<List<double>> similarity) {
  final count = similarity.length;
  final outgoing = [for (final row in similarity) row.fold(0.0, (sum, value) => sum + value)];
  var scores = List<double>.filled(count, 1 / count);
  for (var round = 0; round < _iterations; round += 1) {
    final previous = scores;
    scores = [
      for (var target = 0; target < count; target += 1)
        (1 - _damping) / count + _damping * _incoming(similarity, outgoing, previous, target),
    ];
  }
  return scores;
}

/// What the sentences like [target] pass on to it, each in proportion to how alike they are.
double _incoming(List<List<double>> similarity, List<double> outgoing, List<double> scores, int target) {
  var incoming = 0.0;
  for (var source = 0; source < scores.length; source += 1) {
    final weight = similarity[source][target];
    final total = outgoing[source];
    if (weight > 0 && total > 0) incoming += (weight / total) * scores[source];
  }
  return incoming;
}

/// The note's key sentences, in the order they appear: an extractive summary
/// (each sentence is the note's own words). It needs no model and no network,
/// so it works on any phone, offline. Empty when the note is too short.
List<String> summarize(String text) {
  final sentences = _candidates(text);
  if (sentences.length < minSentencesToSummarize) return [];
  final vectors = _weighted([for (final sentence in sentences) trigramVector(sentence)]);
  final similarity = [
    for (var row = 0; row < vectors.length; row += 1)
      [
        for (var column = 0; column < vectors.length; column += 1)
          row == column ? 0.0 : cosine(vectors[row], vectors[column]),
      ],
  ];
  final ranked = _rank(similarity);
  final scores = [
    for (var index = 0; index < ranked.length; index += 1) ranked[index] * (1 + _leadBonus / (index + 1)),
  ];
  final wanted = math.min(_maxSummarySentences, math.max(1, (sentences.length / _sentencesPerSummarySentence).round()));

  // Highest score first; on a tie the earlier sentence (Dart's sort isn't stable, so say so).
  final byScore = List<int>.generate(scores.length, (index) => index)
    ..sort((a, b) {
      final byValue = scores[b].compareTo(scores[a]);
      return byValue != 0 ? byValue : a - b;
    });
  final picked = <int>[];
  for (final index in byScore) {
    if (picked.length == wanted) break;
    if (picked.every((other) => similarity[index][other] < _maxOverlap)) picked.add(index);
  }
  picked.sort();
  return [for (final index in picked) sentences[index]];
}
