import 'tags.dart';

/// What the search box asks for.
class SearchQuery {
  const SearchQuery({this.terms = const [], this.tags = const []});

  /// Words that must all appear in the note, lower case.
  final List<String> terms;

  /// `#tags` the note must carry.
  final List<String> tags;

  bool get isEmpty => terms.isEmpty && tags.isEmpty;

  @override
  bool operator ==(Object other) =>
      other is SearchQuery && _sameList(other.terms, terms) && _sameList(other.tags, tags);

  @override
  int get hashCode => Object.hash(Object.hashAll(terms), Object.hashAll(tags));
}

/// A run of text, and whether it matched the search (for highlighting).
class TextPart {
  const TextPart(this.text, {required this.match});

  final String text;
  final bool match;

  @override
  bool operator ==(Object other) => other is TextPart && other.text == text && other.match == match;

  @override
  int get hashCode => Object.hash(text, match);

  @override
  String toString() => 'TextPart(${match ? 'match' : 'plain'}, ${text.length} chars)';
}

const _tagPrefix = '#';
final _spaces = RegExp(r'\s+');

bool _sameList(List<String> a, List<String> b) {
  if (a.length != b.length) return false;
  for (var index = 0; index < a.length; index += 1) {
    if (a[index] != b[index]) return false;
  }
  return true;
}

/// "ስብሰባ #work" → terms ["ስብሰባ"], tags ["work"].
SearchQuery parseSearch(String input) {
  final terms = <String>[];
  final tags = <String>[];
  for (final token in input.trim().split(_spaces)) {
    if (token.isEmpty) continue;
    if (token.startsWith(_tagPrefix) && token.length > 1) {
      tags.add(normalizeTag(token.substring(1)));
    } else {
      terms.add(token.toLowerCase());
    }
  }
  return SearchQuery(terms: terms, tags: tags);
}

bool isEmptySearch(SearchQuery query) => query.isEmpty;

/// [lowerText], when given, is [text] lower-cased already.
bool matchesSearch(String text, List<String> noteTags, SearchQuery query, {String? lowerText}) {
  if (query.isEmpty) return true;
  final haystack = lowerText ?? text.toLowerCase();
  return query.terms.every(haystack.contains) && query.tags.every((tag) => hasTag(noteTags, tag));
}

/// Splits [text] around every occurrence of the search terms, for highlighting.
List<TextPart> highlightParts(String text, List<String> terms) {
  final lower = text.toLowerCase();
  // A few characters change length when lower-cased; offsets would drift, so don't highlight.
  if (terms.isEmpty || lower.length != text.length) return [TextPart(text, match: false)];

  final ranges = <(int, int)>[];
  for (final term in terms) {
    if (term.isEmpty) continue;
    for (var at = lower.indexOf(term); at != -1; at = lower.indexOf(term, at + term.length)) {
      ranges.add((at, at + term.length));
    }
  }
  ranges.sort((a, b) => a.$1.compareTo(b.$1));

  final parts = <TextPart>[];
  var cursor = 0;
  for (final (start, end) in ranges) {
    if (end <= cursor) continue;
    final from = start > cursor ? start : cursor;
    if (from > cursor) parts.add(TextPart(text.substring(cursor, from), match: false));
    // Overlapping or touching matches read as one highlight.
    if (from == cursor && parts.isNotEmpty && parts.last.match) {
      parts.last = TextPart(parts.last.text + text.substring(from, end), match: true);
    } else {
      parts.add(TextPart(text.substring(from, end), match: true));
    }
    cursor = end;
  }
  if (cursor < text.length) parts.add(TextPart(text.substring(cursor), match: false));
  return parts;
}
