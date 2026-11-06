/// Plain-text measures for the note assistant: sentences, words, and how
/// alike two pieces of text are. Amharic glues prefixes and suffixes onto its
/// words (በገበያ, ስብሰባውን), so likeness is measured on letter trigrams inside
/// each word, which still match across those forms without a dictionary.
///
/// The desktop splits sentences and words with `Intl.Segmenter` (ICU), which
/// Dart lacks; the rules below are the parts of Unicode's text segmentation
/// (UAX #29) that ICU applies to Amharic and English text.
library;

import 'dart:math' as math;

import 'package:flutter/widgets.dart' show StringCharacters;

/// Term → weight.
typedef TermVector = Map<String, double>;

const _gramSize = 3;
final _hasLetter = RegExp(r'\p{L}', unicode: true);

/// The sentences of a text, each trimmed; Ethiopic full stops (።) and question marks (፧) end them too.
List<String> splitSentences(String text) => [
  for (final line in text.split('\n'))
    for (final sentence in _sentencesOfLine(line))
      if (sentence.trim().isNotEmpty) sentence.trim(),
];

/// The words of a text, lower-cased, without punctuation or bare numbers.
List<String> wordsOf(String text) => [
  for (final word in _wordsOf(text))
    if (_hasLetter.hasMatch(word)) word.toLowerCase(),
];

/// Letters as a reader counts them: one per Ge'ez syllable.
List<String> letters(String word) => word.characters.toList();

/// Counts of the letter trigrams in each word (padded, so short words and word edges count).
TermVector trigramVector(String text) {
  final vector = <String, double>{};
  for (final word in wordsOf(text)) {
    final padded = ['^', ...letters(word), r'$'];
    for (var at = 0; at + _gramSize <= padded.length; at += 1) {
      final gram = padded.sublist(at, at + _gramSize).join();
      vector[gram] = (vector[gram] ?? 0) + 1;
    }
  }
  return vector;
}

double _norm(TermVector vector) {
  var sum = 0.0;
  for (final weight in vector.values) {
    sum += weight * weight;
  }
  return math.sqrt(sum);
}

/// 0 (nothing in common) … 1 (the same terms in the same proportions).
double cosine(TermVector a, TermVector b) {
  final (small, large) = a.length <= b.length ? (a, b) : (b, a);
  var dot = 0.0;
  for (final MapEntry(key: term, value: weight) in small.entries) {
    dot += weight * (large[term] ?? 0);
  }
  final lengths = _norm(a) * _norm(b);
  return lengths == 0 ? 0 : dot / lengths;
}

/// Adds [vector], scaled to unit length, into [into]: a running centroid.
void addNormalized(TermVector into, TermVector vector) {
  final length = _norm(vector);
  if (length == 0) return;
  for (final MapEntry(key: term, value: weight) in vector.entries) {
    into[term] = (into[term] ?? 0) + weight / length;
  }
}

// Sentences (UAX #29 sentence boundaries, rules SB4 to SB11).

enum _SentenceChar { aTerm, sTerm, close, space, paraSep, sContinue, numeric, upper, lower, oLetter, extend, other }

/// `!`, `?`, ። ፧ ፨ and the other scripts' sentence ends.
const _sTerms = {
  0x21, 0x3F, 0x0589, 0x061F, 0x06D4, 0x0964, 0x0965, 0x1362, 0x1367, 0x1368, //
  0x203C, 0x203D, 0x2047, 0x2048, 0x2049, 0x3002, 0xFE56, 0xFE57, 0xFF01, 0xFF1F, 0xFF61,
};

/// Full stops, which may also be abbreviations or decimal points.
const _aTerms = {0x2E, 0x2024, 0xFE52, 0xFF0E};

/// Commas, colons, semicolons and dashes: a sentence end before them isn't one.
const _sContinues = {
  0x2C, 0x2D, 0x3A, 0x3B, 0x055D, 0x060C, 0x060D, 0x07F8, 0x1802, 0x1808, 0x2013, 0x2014, 0x3001, //
  0xFE10, 0xFE11, 0xFE13, 0xFE31, 0xFE32, 0xFE50, 0xFE51, 0xFE55, 0xFE58, 0xFE63, 0xFF0C, 0xFF0D, 0xFF1A, 0xFF64,
};
const _paraSeps = {0x0D, 0x85, 0x2028, 0x2029};
final _close = RegExp(r'''[\p{Ps}\p{Pe}\p{Pi}\p{Pf}"']''', unicode: true);
final _space = RegExp(r'\s', unicode: true);
final _numeric = RegExp(r'\p{Nd}', unicode: true);
final _upper = RegExp(r'[\p{Lu}\p{Lt}]', unicode: true);
final _lower = RegExp(r'\p{Ll}', unicode: true);
final _letter = RegExp(r'\p{L}', unicode: true);
final _extend = RegExp(r'[\p{M}\p{Cf}]', unicode: true);
final _sentenceChars = <int, _SentenceChar>{};

_SentenceChar _sentenceChar(int rune) => _sentenceChars.putIfAbsent(rune, () {
  if (_sTerms.contains(rune)) return _SentenceChar.sTerm;
  if (_aTerms.contains(rune)) return _SentenceChar.aTerm;
  if (_paraSeps.contains(rune)) return _SentenceChar.paraSep;
  if (_sContinues.contains(rune)) return _SentenceChar.sContinue;
  final char = String.fromCharCode(rune);
  if (_space.hasMatch(char)) return _SentenceChar.space;
  if (_close.hasMatch(char)) return _SentenceChar.close;
  if (_numeric.hasMatch(char)) return _SentenceChar.numeric;
  if (_upper.hasMatch(char)) return _SentenceChar.upper;
  if (_lower.hasMatch(char)) return _SentenceChar.lower;
  if (_letter.hasMatch(char)) return _SentenceChar.oLetter;
  if (_extend.hasMatch(char)) return _SentenceChar.extend;
  return _SentenceChar.other;
});

bool _isTerm(_SentenceChar kind) => kind == _SentenceChar.aTerm || kind == _SentenceChar.sTerm;

/// The line's sentences, untrimmed, each ending after its stop, closing quotes and spaces.
List<String> _sentencesOfLine(String line) {
  final runes = line.runes.toList();
  final kinds = runes.map(_sentenceChar).toList();
  final sentences = <String>[];
  var start = 0;
  var at = 0;
  while (at < kinds.length) {
    final kind = kinds[at];
    if (kind == _SentenceChar.paraSep) {
      at += 1;
    } else if (!_isTerm(kind)) {
      at += 1;
      continue;
    } else {
      final next = _endOfSentence(kinds, at);
      if (next == null) {
        at = _skipExtend(kinds, at + 1);
        continue;
      }
      at = next;
    }
    sentences.add(String.fromCharCodes(runes.sublist(start, at)));
    start = at;
  }
  if (start < runes.length) sentences.add(String.fromCharCodes(runes.sublist(start)));
  return sentences;
}

/// Where the sentence ending at the stop [stop] ends, or null when the stop doesn't end it.
int? _endOfSentence(List<_SentenceChar> kinds, int stop) {
  final isFullStop = kinds[stop] == _SentenceChar.aTerm;
  final after = _skipExtend(kinds, stop + 1);
  final following = after < kinds.length ? kinds[after] : null;
  if (isFullStop && following == _SentenceChar.numeric) return null; // 3.5
  if (isFullStop && following == _SentenceChar.upper && _isCased(_previous(kinds, stop))) return null; // U.S
  var end = after;
  while (end < kinds.length && kinds[end] == _SentenceChar.close) {
    end = _skipExtend(kinds, end + 1);
  }
  while (end < kinds.length && kinds[end] == _SentenceChar.space) {
    end = _skipExtend(kinds, end + 1);
  }
  if (end == kinds.length) return end;
  final kind = kinds[end];
  if (kind == _SentenceChar.paraSep) return end + 1;
  if (isFullStop && _lowerCaseFollows(kinds, end)) return null; // "e.g. the"
  if (kind == _SentenceChar.sContinue || _isTerm(kind)) return null; // "Hi!, he said", "?!"
  return end;
}

/// After a full stop, a lower-case word before any other letter or stop: the sentence goes on.
bool _lowerCaseFollows(List<_SentenceChar> kinds, int from) {
  for (var at = from; at < kinds.length; at += 1) {
    switch (kinds[at]) {
      case _SentenceChar.lower:
        return true;
      case _SentenceChar.oLetter || _SentenceChar.upper || _SentenceChar.paraSep:
        return false;
      case final kind when _isTerm(kind):
        return false;
      default:
        continue;
    }
  }
  return false;
}

bool _isCased(_SentenceChar? kind) => kind == _SentenceChar.upper || kind == _SentenceChar.lower;

_SentenceChar? _previous(List<_SentenceChar> kinds, int at) {
  for (var before = at - 1; before >= 0; before -= 1) {
    if (kinds[before] != _SentenceChar.extend) return kinds[before];
  }
  return null;
}

int _skipExtend(List<_SentenceChar> kinds, int from) {
  var at = from;
  while (at < kinds.length && kinds[at] == _SentenceChar.extend) {
    at += 1;
  }
  return at;
}

// Words (UAX #29 word boundaries, rules WB4 to WB13b).

enum _WordChar { letter, numeric, extendNumLet, midLetter, midNum, midNumLet, extend, other }

/// Joins two letters (a:b, a·b).
const _midLetters = {0x3A, 0xB7, 0x0387, 0x055F, 0x05F4, 0x2027, 0xFE13, 0xFE55, 0xFF1A};

/// Joins two numbers (3,5 or 3;5).
const _midNums = {0x2C, 0x3B, 0x037E, 0x0589, 0x060C, 0x060D, 0x066C, 0x07F8, 0x2044, 0xFE10, 0xFE14, 0xFE50, 0xFE54};

/// Joins either (e.g, don't, can’t, 3.5).
const _midNumLets = {0x27, 0x2E, 0x2018, 0x2019, 0x2024, 0xFE52, 0xFF07, 0xFF0E};
final _connector = RegExp(r'\p{Pc}', unicode: true);
final _wordChars = <int, _WordChar>{};

_WordChar _wordChar(int rune) => _wordChars.putIfAbsent(rune, () {
  if (_midLetters.contains(rune)) return _WordChar.midLetter;
  if (_midNums.contains(rune)) return _WordChar.midNum;
  if (_midNumLets.contains(rune)) return _WordChar.midNumLet;
  final char = String.fromCharCode(rune);
  if (_letter.hasMatch(char)) return _WordChar.letter;
  if (_numeric.hasMatch(char)) return _WordChar.numeric;
  if (_connector.hasMatch(char)) return _WordChar.extendNumLet;
  if (_extend.hasMatch(char)) return _WordChar.extend;
  return _WordChar.other;
});

bool _isWordPart(_WordChar kind) =>
    kind == _WordChar.letter || kind == _WordChar.numeric || kind == _WordChar.extendNumLet;

/// The text's words and numbers, as written (letters, digits and what joins them).
List<String> _wordsOf(String text) {
  final runes = text.runes.toList();
  final kinds = runes.map(_wordChar).toList();
  final words = <String>[];
  var at = 0;
  while (at < kinds.length) {
    if (!_isWordPart(kinds[at])) {
      at += 1;
      continue;
    }
    final start = at;
    at = _endOfWord(kinds, at);
    words.add(String.fromCharCodes(runes.sublist(start, at)));
  }
  return words;
}

/// Where the word starting at [start] ends.
int _endOfWord(List<_WordChar> kinds, int start) {
  var last = kinds[start];
  var at = start + 1;
  while (true) {
    while (at < kinds.length && kinds[at] == _WordChar.extend) {
      at += 1;
    }
    if (at >= kinds.length) return at;
    final kind = kinds[at];
    if (_isWordPart(kind)) {
      last = kind;
      at += 1;
      continue;
    }
    final joined = _joinedAcross(kinds, at, last);
    if (joined == null) return at;
    at = joined;
  }
}

/// The index of the letter or digit that [kinds]`[at]` joins onto the word, if it joins one.
int? _joinedAcross(List<_WordChar> kinds, int at, _WordChar last) {
  final kind = kinds[at];
  var next = at + 1;
  while (next < kinds.length && kinds[next] == _WordChar.extend) {
    next += 1;
  }
  if (next >= kinds.length) return null;
  final following = kinds[next];
  final joinsLetters = kind == _WordChar.midLetter || kind == _WordChar.midNumLet;
  final joinsNumbers = kind == _WordChar.midNum || kind == _WordChar.midNumLet;
  if (joinsLetters && last == _WordChar.letter && following == _WordChar.letter) return next;
  if (joinsNumbers && last == _WordChar.numeric && following == _WordChar.numeric) return next;
  return null;
}
