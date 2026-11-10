import 'note_text.dart';

/// Letters (any script, Ge'ez included), combining marks, digits, `_` and `-`.
const _tagWord = r'[\p{L}\p{M}\p{N}_-]+';

/// Bear-style tags: `#tag` or nested `#parent/child`, at the start of a line or
/// after a space or opening bracket (so `site.com/#anchor` is not a tag).
final _tagPattern = RegExp('(^|[\\s(\\[{])#($_tagWord(?:/$_tagWord)*)', unicode: true);
final _hasLetter = RegExp(r'\p{L}', unicode: true);
const tagSeparator = '/';

/// One `#tag` found in a text.
class TagMatch {
  const TagMatch({required this.tag, required this.start, required this.end});

  /// Normalized: lower case, as stored and matched.
  final String tag;

  /// Offsets of `#tag` in the text (UTF-16, as `String` indexes), `#` included.
  final int start;
  final int end;

  @override
  bool operator ==(Object other) => other is TagMatch && other.tag == tag && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(tag, start, end);

  @override
  String toString() => 'TagMatch($start–$end)';
}

/// A branch of the sidebar's tag tree.
class TagNode {
  TagNode({required this.name, required this.path, required this.count, List<TagNode>? children})
    : children = children ?? [];

  /// The last segment, e.g. "meetings".
  final String name;

  /// The whole path, e.g. "work/meetings".
  final String path;

  /// Notes tagged with this path or anything under it.
  final int count;
  final List<TagNode> children;
}

String normalizeTag(String tag) => tag.toLowerCase();

/// Every tag in [text], in order. `#2024` alone is a number, not a tag.
List<TagMatch> findTags(String text) => [
  for (final match in _tagPattern.allMatches(text))
    if (_hasLetter.hasMatch(match.group(2)!))
      TagMatch(
        tag: normalizeTag(match.group(2)!),
        start: match.start + match.group(1)!.length,
        end: match.start + match.group(1)!.length + 1 + match.group(2)!.length,
      ),
];

/// The distinct tags in [text].
List<String> extractTags(String text) => {for (final match in findTags(text)) match.tag}.toList();

final _spaces = RegExp(r'\s+');

/// True when [text] has tags and nothing else but spaces, like a closing `#ስራ #ideas` line.
bool holdsOnlyTags(String text) {
  final tagged = findTags(text).fold(0, (sum, match) => sum + match.end - match.start);
  final written = text.replaceAll(_spaces, '').length;
  return written > 0 && written == tagged;
}

/// True when the note carries [path] itself or any tag nested under it.
bool hasTag(List<String> noteTags, String path) {
  final prefix = '$path$tagSeparator';
  return noteTags.any((tag) => tag == path || tag.startsWith(prefix));
}

List<String> _ancestorsAndSelf(String tag) {
  final parts = tag.split(tagSeparator);
  return [for (var index = 0; index < parts.length; index += 1) parts.sublist(0, index + 1).join(tagSeparator)];
}

/// The sidebar's tag tree: parents exist for nested tags even if nothing is tagged with the parent alone.
List<TagNode> buildTagTree(Iterable<List<String>> tagLists) {
  final counts = <String, int>{};
  for (final tags in tagLists) {
    final paths = {for (final tag in tags) ..._ancestorsAndSelf(tag)};
    for (final path in paths) {
      counts[path] = (counts[path] ?? 0) + 1;
    }
  }

  final roots = <TagNode>[];
  final nodes = <String, TagNode>{};
  // A parent sorts before its children, so it is always there to hang them on.
  final ordered = counts.keys.toList()..sort(compareText);
  for (final path in ordered) {
    final cut = path.lastIndexOf(tagSeparator);
    final node = TagNode(name: path.substring(cut + 1), path: path, count: counts[path] ?? 0);
    nodes[path] = node;
    final parent = cut == -1 ? null : nodes[path.substring(0, cut)];
    (parent?.children ?? roots).add(node);
  }
  return roots;
}
