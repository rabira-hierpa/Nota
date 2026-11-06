import 'dart:math';

/// A first line longer than this (a transcript is often one long line) is cut for the title.
const titleLimit = 80;
const maxPreviewLength = 240;

/// Spaces, and the Ge'ez word separator ፡ that older Amharic text uses instead.
final _wordBreak = RegExp(r'[\s፡]+', unicode: true);
final _sentenceEnd = RegExp(r'[።.!?፧]$', unicode: true);
final _sentenceMark = RegExp(r'[።.!?፧]', unicode: true);
final _letterOrMark = RegExp(r'[\p{L}\p{M}]', unicode: true);
final _number = RegExp(r'\p{N}', unicode: true);
const _ellipsis = '…';

/// A `# heading` marker. The desktop's headings are formatting, not text, so
/// its titles never show one; on the phone the marker is typed, and dropped
/// from the title (as Bear does). `#tag` has no space and stays.
final _headingMarker = RegExp(r'^#{1,6}\s+');

/// The lines with text, trimmed, read lazily: a title needs only the first,
/// so the list doesn't split a long note to sort or show it.
Iterable<String> _lines(String text) sync* {
  var start = 0;
  while (start <= text.length) {
    final newline = text.indexOf('\n', start);
    final end = newline == -1 ? text.length : newline;
    final line = text.substring(start, end).trim();
    if (line.isNotEmpty) yield line;
    start = end + 1;
  }
}

/// The first line with text, without a heading marker.
String _firstLine(Iterable<String> lines) => lines.isEmpty ? '' : lines.first.replaceFirst(_headingMarker, '');

/// The title and what follows it: the first line, or its first words when the line runs long.
({String title, Iterable<String> rest}) _splitTitle(String text) {
  final lines = _lines(text);
  final first = _firstLine(lines);
  final others = lines.skip(1);
  if (first.length <= titleLimit) return (title: first, rest: others);
  // Prefer the end of a sentence, then the end of a word, then just the limit.
  final window = first.substring(0, min(first.length, titleLimit + 1));
  final sentenceEnd = _sentenceMark.allMatches(window).fold(0, (end, match) => max(end, match.start + 1));
  final wordEnd = window.lastIndexOf(' ');
  final cut = [sentenceEnd, wordEnd].firstWhere((at) => at > titleLimit / 2, orElse: () => titleLimit);
  final head = first.substring(0, cut).trim();
  return (
    title: _sentenceEnd.hasMatch(head) ? head : '$head$_ellipsis',
    rest: [first.substring(cut).trim()].followedBy(others),
  );
}

/// The first line with text, whole: what a `[[link]]` names.
String firstLine(String text) => _firstLine(_lines(text));

/// Like Bear, a note's title is its first line. Empty when the note has no text.
String noteTitle(String text) => _splitTitle(text).title;

/// The text after the title, flattened onto one line for the note list.
/// Reads only as many lines as the preview shows.
String notePreview(String text) {
  final preview = StringBuffer();
  for (final line in _splitTitle(text).rest) {
    if (line.isEmpty) continue;
    if (preview.isNotEmpty) preview.write(' ');
    preview.write(line);
    if (preview.length >= maxPreviewLength) break;
  }
  final joined = preview.toString();
  return joined.substring(0, min(joined.length, maxPreviewLength));
}

int wordCount(String text) => text.split(_wordBreak).where((word) => word.isNotEmpty).length;

/// Orders text close to how the desktop's `localeCompare` (ICU's root
/// collation) does, which Dart has no collator for: spaces and punctuation
/// first (in ICU's order), then digits, then letters. Letters compare by the
/// letter, then accents (plain first), then case (lower first); with
/// [ignoreCase] accents and case don't count, like `sensitivity: "base"`.
/// Latin comes before Ge'ez, and Ge'ez follows its own order (ሀ ለ ሐ መ…), as
/// both are in code point order.
int compareText(String a, String b, {bool ignoreCase = false}) {
  final left = a.runes.toList();
  final right = b.runes.toList();
  final shared = min(left.length, right.length);
  for (var index = 0; index < shared; index += 1) {
    final byLetter = _collationKey(left[index]).compareTo(_collationKey(right[index]));
    if (byLetter != 0) return byLetter;
  }
  if (left.length != right.length || ignoreCase) return left.length - right.length;
  for (var index = 0; index < shared; index += 1) {
    final accented = _plainLatin(left[index]) != null;
    if (accented != (_plainLatin(right[index]) != null)) return accented ? 1 : -1;
  }
  for (var index = 0; index < shared; index += 1) {
    final lower = _isLowerCase(left[index]);
    if (lower != _isLowerCase(right[index])) return lower ? -1 : 1;
  }
  for (var index = 0; index < shared; index += 1) {
    if (left[index] != right[index]) return left[index] - right[index];
  }
  return 0;
}

/// Spaces and punctuation as ICU orders them; others follow, by code point.
const _punctuationOrder = '\t _-–—,;:፡፣፤፥፦!?፧.…።፨\'‘’"“”«»()[]{}@*/\\&#%•`^+<=>|~\$';

/// The plain letter each Latin letter from U+00C0 to U+017F sorts with (é → e); `.` where none.
const _foldedLatin =
    'aaaaaaaceeeeiiiidnooooo.ouuuuy.saaaaaaaceeeeiiiidnooooo.ouuuuy.y'
    'aaaaaaccccccccddddeeeeeeeeeegggggggghhhhiiiiiiiiiiiijjkkkllllllllllnnnnnnnnnoooooooorrrrrrssssssssttttttuuuuuuuuuuuuwwyyyzzzzzzs';
const _firstFolded = 0xC0;

/// The plain letter an accented Latin one sorts with, or null.
int? _plainLatin(int rune) {
  if (rune < _firstFolded || rune >= _firstFolded + _foldedLatin.length) return null;
  final plain = _foldedLatin.codeUnitAt(rune - _firstFolded);
  return plain == 0x2E ? null : plain;
}

/// A character's group (punctuation 0, digit 1, letter 2) above its place in the group.
int _collationKey(int rune) {
  final plain = _plainLatin(rune);
  if (plain != null) return (2 << 21) | plain;
  final char = String.fromCharCode(rune);
  if (_letterOrMark.hasMatch(char)) return (2 << 21) | char.toLowerCase().runes.first;
  if (_number.hasMatch(char)) return (1 << 21) | rune;
  final rank = _punctuationOrder.indexOf(char);
  return rank == -1 ? _punctuationOrder.length + rune : rank;
}

bool _isLowerCase(int rune) {
  final char = String.fromCharCode(rune);
  return char.toLowerCase() == char;
}
