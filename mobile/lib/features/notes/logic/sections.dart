import '../../../l10n/notes_messages.dart';
import '../data/note.dart';
import 'note_text.dart';
import 'search.dart';
import 'tags.dart';

/// The fixed sections, in the drawer's order. Each names its section.
enum FixedSectionKind {
  all(AllSection()),
  today(TodaySection()),
  todo(TodoSection()),
  favorites(FavoritesSection()),
  untagged(UntaggedSection()),
  voice(VoiceSection()),
  archive(ArchiveSection()),
  trash(TrashSection());

  const FixedSectionKind(this.section);

  final FixedSection section;
}

/// The drawer's places to look: Bear's sections plus one per tag.
sealed class NoteSection {
  const NoteSection();

  static const all = AllSection();
  static const today = TodaySection();
  static const todo = TodoSection();
  static const favorites = FavoritesSection();
  static const untagged = UntaggedSection();
  static const voice = VoiceSection();
  static const archive = ArchiveSection();
  static const trash = TrashSection();
}

/// One of the sections every library has, which the drawer counts.
sealed class FixedSection extends NoteSection {
  const FixedSection();

  FixedSectionKind get kind;

  @override
  bool operator ==(Object other) => other is FixedSection && other.kind == kind;

  @override
  int get hashCode => kind.hashCode;

  @override
  String toString() => 'NoteSection.${kind.name}';
}

/// Every note outside the Archive and the Trash.
final class AllSection extends FixedSection {
  const AllSection();

  @override
  FixedSectionKind get kind => FixedSectionKind.all;
}

/// Notes written or changed today, on the phone's calendar.
final class TodaySection extends FixedSection {
  const TodaySection();

  @override
  FixedSectionKind get kind => FixedSectionKind.today;
}

/// Notes with an open checklist item: a line starting `- [ ]` (see [hasOpenTodo]).
final class TodoSection extends FixedSection {
  const TodoSection();

  @override
  FixedSectionKind get kind => FixedSectionKind.todo;
}

final class FavoritesSection extends FixedSection {
  const FavoritesSection();

  @override
  FixedSectionKind get kind => FixedSectionKind.favorites;
}

final class UntaggedSection extends FixedSection {
  const UntaggedSection();

  @override
  FixedSectionKind get kind => FixedSectionKind.untagged;
}

/// Notes made from a recording.
final class VoiceSection extends FixedSection {
  const VoiceSection();

  @override
  FixedSectionKind get kind => FixedSectionKind.voice;
}

final class ArchiveSection extends FixedSection {
  const ArchiveSection();

  @override
  FixedSectionKind get kind => FixedSectionKind.archive;
}

final class TrashSection extends FixedSection {
  const TrashSection();

  @override
  FixedSectionKind get kind => FixedSectionKind.trash;
}

/// The notes carrying a tag or anything nested under it.
final class TagSection extends NoteSection {
  const TagSection(this.path);

  /// Lower case, as tags are stored, e.g. "work/meetings".
  final String path;

  @override
  bool operator ==(Object other) => other is TagSection && other.path == path;

  @override
  int get hashCode => path.hashCode;

  @override
  String toString() => 'TagSection(${path.length} chars)';
}

/// How the note list is ordered (pinned notes lead either way).
enum SortOrder { edited, created, title }

/// A note with what filtering needs worked out once, rather than on every filter.
class IndexedNote {
  IndexedNote(this.note, this.tags);

  final Note note;
  final List<String> tags;

  /// What search reads: the whole note (the phone has no locked notes, whose body the desktop leaves out).
  String get searchText => note.text;

  /// [searchText] in lower case, made on the first search and kept: the list
  /// is filtered again on every change while a search is on.
  late final String lowerSearchText = searchText.toLowerCase();
}

/// How many notes each fixed section holds.
typedef SectionCounts = Map<FixedSectionKind, int>;

/// An open checklist item: the desktop reads ticked boxes from the editor's
/// HTML; a phone note is plain text, so a line (indented or not) starting
/// `- [ ]` is open and `- [x]` is done.
final _openTodo = RegExp(r'^[ \t]*- \[ \]', multiLine: true);

/// True when [text] has a checklist item left unticked.
bool hasOpenTodo(String text) => _openTodo.hasMatch(text);

List<IndexedNote> indexNotes(List<Note> notes) => [for (final note in notes) IndexedNote(note, extractTags(note.text))];

/// A section's name in the interface's language; a tag is its `#path`.
String sectionTitle(NoteSection section, SectionsMessages titles) => switch (section) {
  TagSection(:final path) => '#$path',
  AllSection() => titles.all,
  TodaySection() => titles.today,
  TodoSection() => titles.todo,
  FavoritesSection() => titles.favorites,
  UntaggedSection() => titles.untagged,
  VoiceSection() => titles.voice,
  ArchiveSection() => titles.archive,
  TrashSection() => titles.trash,
};

bool isSameSection(NoteSection a, NoteSection b) => a == b;

bool _isSameDay(DateTime date, DateTime now) {
  final local = date.toLocal();
  return local.year == now.year && local.month == now.month && local.day == now.day;
}

/// Notes in the Trash appear only there; archived notes only in the Archive (and the Trash).
bool isInSection(IndexedNote entry, NoteSection section, {DateTime? now}) {
  final note = entry.note;
  if (section is TrashSection) return note.trashedAt != null;
  if (note.trashedAt != null) return false;
  if (section is ArchiveSection) return note.archivedAt != null;
  if (note.archivedAt != null) return false;
  return switch (section) {
    AllSection() => true,
    TodaySection() => _isToday(note, (now ?? DateTime.now()).toLocal()),
    TodoSection() => hasOpenTodo(note.text),
    FavoritesSection() => note.favorite,
    UntaggedSection() => entry.tags.isEmpty,
    VoiceSection() => note.audio != null,
    TagSection(:final path) => hasTag(entry.tags, path),
    ArchiveSection() || TrashSection() => false,
  };
}

bool _isToday(Note note, DateTime now) => _isSameDay(note.updatedAt, now) || _isSameDay(note.createdAt, now);

DateTime _sortKey(Note note, NoteSection section, SortOrder sort) => switch (section) {
  // The Trash and the Archive list what was put there last first.
  TrashSection() => note.trashedAt ?? note.updatedAt,
  ArchiveSection() => note.archivedAt ?? note.updatedAt,
  _ => sort == SortOrder.created ? note.createdAt : note.updatedAt,
};

/// Compares the notes at two places in [notes]; titles, when the order needs
/// them, are worked out once per note rather than once per comparison.
int Function(int, int) _compareNotes(List<Note> notes, NoteSection section, SortOrder sort) {
  final pinsLead = section is! TrashSection && section is! ArchiveSection;
  final titles = sort == SortOrder.title && pinsLead ? [for (final note in notes) noteTitle(note.text)] : null;
  return (left, right) {
    final a = notes[left];
    final b = notes[right];
    if (pinsLead && a.pinned != b.pinned) return a.pinned ? -1 : 1;
    if (titles != null) {
      final byTitle = compareText(titles[left], titles[right], ignoreCase: true);
      if (byTitle != 0) return byTitle;
    }
    return _sortKey(b, section, sort).compareTo(_sortKey(a, section, sort));
  };
}

/// The note list: the section's notes that match the search, pinned first, then in the chosen order.
List<Note> notesInSection(
  List<IndexedNote> entries,
  NoteSection section,
  SearchQuery query, {
  SortOrder sort = SortOrder.edited,
  DateTime? now,
}) {
  final today = (now ?? DateTime.now()).toLocal();
  final searching = !query.isEmpty;
  final notes = [
    for (final entry in entries)
      if (isInSection(entry, section, now: today) &&
          (!searching || matchesSearch(entry.searchText, entry.tags, query, lowerText: entry.lowerSearchText)))
        entry.note,
  ];
  final compare = _compareNotes(notes, section, sort);
  // Notes that tie keep the order they came in (Dart's sort isn't stable, so say so).
  final order = List<int>.generate(notes.length, (index) => index)
    ..sort((a, b) {
      final byNote = compare(a, b);
      return byNote != 0 ? byNote : a - b;
    });
  return [for (final index in order) notes[index]];
}

SectionCounts countSections(List<IndexedNote> entries, {DateTime? now}) {
  final today = (now ?? DateTime.now()).toLocal();
  final counts = {for (final kind in FixedSectionKind.values) kind: 0};
  for (final entry in entries) {
    for (final kind in FixedSectionKind.values) {
      if (isInSection(entry, kind.section, now: today)) counts[kind] = counts[kind]! + 1;
    }
  }
  return counts;
}
