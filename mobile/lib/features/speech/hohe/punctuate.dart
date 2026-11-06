import 'dart:math' as math;

import 'sentencepiece.dart';

/// models/punct.json: the punctuation model's window, labels and pieces.
final class PunctuationConfig {
  const PunctuationConfig({
    required this.maxLength,
    required this.postLabels,
    required this.bos,
    required this.eos,
    required this.table,
  });

  /// Reads punct.json; throws a [FormatException] if it isn't one.
  factory PunctuationConfig.fromJson(Map<String, Object?> json) {
    final maxLength = json['maxLength'];
    final postLabels = json['postLabels'];
    final bos = json['bos'];
    final eos = json['eos'];
    if (maxLength is! int || maxLength < 3 || bos is! int || bos < 0 || eos is! int || eos < 0) {
      throw const FormatException('punct.json: bad window');
    }
    if (postLabels is! List<Object?> || postLabels.isEmpty || postLabels.any((label) => label is! String)) {
      throw const FormatException('punct.json: bad labels');
    }
    return PunctuationConfig(
      maxLength: maxLength,
      postLabels: List<String>.unmodifiable(postLabels.cast<String>()),
      bos: bos,
      eos: eos,
      table: PieceTable.fromJson(json),
    );
  }

  /// The most pieces one window takes, BOS and EOS included.
  final int maxLength;

  /// The marks the model can put after a piece, by label id.
  final List<String> postLabels;
  final int bos;
  final int eos;
  final PieceTable table;
}

/// The model's answers for one window, per position (BOS and EOS included).
final class WindowLabels {
  const WindowLabels({required this.post, required this.seg});

  /// Index into postLabels: the mark after each piece.
  final List<int> post;

  /// Whether a sentence ends after each piece (non-zero if it does).
  final List<int> seg;
}

/// Runs the model on one window of piece ids.
typedef RunWindow = Future<WindowLabels> Function(List<int> ids);

/// Labels that end a sentence with a question, and those that end it with a full stop (Ethiopic ። for both scripts).
const _questionLabels = {'?', '？', '؟', '፧'};
const _fullStopLabels = {'.', '。', '।', '።'};
const _questionMark = '?';
const _fullStop = '።';

/// A word already ending in one of these keeps it.
final _sentenceEnd = RegExp(r'[.!?።፧]$', unicode: true);
final _whitespace = RegExp(r'\s+');

final class _Label {
  const _Label(this.margin, this.post, this.seg);

  final int margin;
  final int post;
  final int seg;
}

/// Labels for every piece. Long texts run in windows that overlap by half;
/// each piece takes its label from the window where it sits furthest from a cut.
Future<List<_Label>> _labelPieces(List<int> ids, PunctuationConfig config, RunWindow run) async {
  final room = config.maxLength - 2;
  // At least 1, so a window of one piece still moves on (the desktop's floor(room / 2) for any real model).
  final step = math.max(1, room ~/ 2);
  final labels = List.filled(ids.length, const _Label(-1, 0, 0));
  for (var start = 0; ; start += step) {
    final chunk = ids.sublist(start, math.min(start + room, ids.length));
    final window = await run([config.bos, ...chunk, config.eos]);
    final atStart = start == 0;
    final atEnd = start + room >= ids.length;
    for (var k = 0; k < chunk.length; k++) {
      final margin = math.min(atStart ? ids.length : k, atEnd ? ids.length : chunk.length - 1 - k);
      if (margin > labels[start + k].margin) labels[start + k] = _Label(margin, window.post[k + 1], window.seg[k + 1]);
    }
    if (atEnd) return labels;
  }
}

/// The sentence end to write after a word, given the mark the model puts
/// there and whether its sentence head ends a sentence there: both must agree.
String sentenceEnd(String mark, bool endsSentence) {
  if (!endsSentence) return '';
  if (_questionLabels.contains(mark)) return _questionMark;
  return _fullStopLabels.contains(mark) ? _fullStop : '';
}

/// Hohe's text with sentence ends put back (it writes none). Only full stops
/// and question marks: on Hohe's FLEURS text the model's full stops score
/// F1 82, its commas about 35, so commas are left out.
Future<String> punctuate(String text, UnigramTokenizer tokenizer, PunctuationConfig config, RunWindow run) async {
  final words = text.split(_whitespace).where((word) => word.isNotEmpty).toList();
  final ids = <int>[];
  final lastPiece = <int>[];
  for (final word in words) {
    ids.addAll(tokenizer.encodeWord(word));
    lastPiece.add(ids.length - 1);
  }
  if (ids.isEmpty) return text;
  final labels = await _labelPieces(ids, config, run);
  return [for (var i = 0; i < words.length; i++) _withEnd(words[i], labels[lastPiece[i]], config.postLabels)].join(' ');
}

String _withEnd(String word, _Label label, List<String> postLabels) {
  if (_sentenceEnd.hasMatch(word)) return word;
  final mark = label.post >= 0 && label.post < postLabels.length ? postLabels[label.post] : '';
  return '$word${sentenceEnd(mark, label.seg != 0)}';
}
