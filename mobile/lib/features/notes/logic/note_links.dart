import '../data/note.dart';
import 'note_text.dart';

/// Bear-style links: `[[Another note's title]]`, on one line.
final _linkPattern = RegExp(r'\[\[([^[\]\n]{1,200})\]\]');

/// One `[[link]]` found in a text.
class LinkMatch {
  const LinkMatch({required this.title, required this.start, required this.end});

  /// The title as written between the brackets, trimmed.
  final String title;

  /// Offsets of `[[…]]` in the text (UTF-16, as `String` indexes), brackets included.
  final int start;
  final int end;

  @override
  bool operator ==(Object other) =>
      other is LinkMatch && other.title == title && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(title, start, end);

  @override
  String toString() => 'LinkMatch($start–$end)';
}

/// Titles compare without case or surrounding space.
String linkKey(String title) => title.trim().toLowerCase();

List<LinkMatch> findLinks(String text) => [
  for (final match in _linkPattern.allMatches(text))
    if (match.group(1)!.trim().isNotEmpty) LinkMatch(title: match.group(1)!.trim(), start: match.start, end: match.end),
];

/// The note a link points at: the newest one outside the Trash whose first line is that title.
Note? findLinkedNote(List<Note> notes, String title) {
  final key = linkKey(title);
  Note? newest;
  for (final note in notes) {
    if (note.trashedAt != null || linkKey(firstLine(note.text)) != key) continue;
    if (newest == null || note.updatedAt.isAfter(newest.updatedAt)) newest = note;
  }
  return newest;
}

/// Notes that link to this one by its title.
List<Note> backlinksTo(List<Note> notes, Note target) {
  final key = linkKey(firstLine(target.text));
  if (key.isEmpty) return [];
  return [
    for (final note in notes)
      if (note.id != target.id &&
          note.trashedAt == null &&
          findLinks(note.text).any((link) => linkKey(link.title) == key))
        note,
  ];
}
