import 'dart:typed_data';

/// models/hohe.json: Hohe's CTC tokens by id.
final class CtcVocabulary {
  const CtcVocabulary({required this.tokens, required this.blank, required this.wordDelimiter});

  /// Reads hohe.json; throws a [FormatException] if it isn't one.
  factory CtcVocabulary.fromJson(Map<String, Object?> json) {
    final tokens = json['tokens'];
    final blank = json['blank'];
    final wordDelimiter = json['wordDelimiter'];
    if (tokens is! List<Object?> || tokens.isEmpty || tokens.any((token) => token is! String)) {
      throw const FormatException('hohe.json: bad tokens');
    }
    if (blank is! int || blank < 0 || blank >= tokens.length || wordDelimiter is! String) {
      throw const FormatException('hohe.json: bad blank or word delimiter');
    }
    return CtcVocabulary(
      tokens: List<String>.unmodifiable(tokens.cast<String>()),
      blank: blank,
      wordDelimiter: wordDelimiter,
    );
  }

  final List<String> tokens;
  final int blank;
  final String wordDelimiter;
}

/// Language tags such as [AMH], which Hohe writes at the start of its text.
final _languageTag = RegExp(r'\[[A-Z]+\]');
final _whitespace = RegExp(r'\s+');

/// The most likely token at each step (the first on a tie, as numpy's argmax).
List<int> bestTokens(Float32List logits, int steps, int size) {
  final ids = Int32List(steps);
  for (var t = 0; t < steps; t++) {
    final row = t * size;
    var best = 0;
    for (var v = 1; v < size; v++) {
      if (logits[row + v] > logits[row + best]) best = v;
    }
    ids[t] = best;
  }
  return ids;
}

/// Greedy CTC: repeats merged, blanks dropped, the word delimiter read as a
/// space, language tags removed. The same text as `processor.batch_decode`
/// plus the clean-up in the desktop's electron/python/amharic_transcriber.py.
String decodeCtc(List<int> ids, CtcVocabulary vocabulary) {
  final tokens = vocabulary.tokens;
  final blank = tokens[vocabulary.blank];
  final text = StringBuffer();
  String? previous;
  for (final id in ids) {
    final token = id >= 0 && id < tokens.length ? tokens[id] : '';
    if (token != previous && token != blank) text.write(token == vocabulary.wordDelimiter ? ' ' : token);
    previous = token;
  }
  return text.toString().replaceAll(_languageTag, ' ').split(_whitespace).where((word) => word.isNotEmpty).join(' ');
}
