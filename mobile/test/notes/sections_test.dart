import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/logic/search.dart';
import 'package:nota/features/notes/logic/sections.dart';
import 'package:nota/l10n/notes_messages.dart';

final _first = DateTime.parse('2026-10-01T09:00:00.000Z');

Note _note(
  String id, {
  String text = '',
  DateTime? createdAt,
  DateTime? updatedAt,
  bool favorite = false,
  bool pinned = false,
  DateTime? archivedAt,
  DateTime? trashedAt,
  NoteAudio? audio,
}) => Note(
  id: id,
  createdAt: createdAt ?? _first,
  updatedAt: updatedAt ?? _first,
  text: text,
  favorite: favorite,
  pinned: pinned,
  archivedAt: archivedAt,
  trashedAt: trashedAt,
  audio: audio,
);

List<String> _ids(List<Note> notes) => [for (final note in notes) note.id];

void main() {
  final meeting = _note(
    'meeting',
    text: 'ስብሰባ #work/meetings',
    updatedAt: DateTime.parse('2026-10-03T09:00:00.000Z'),
    favorite: true,
  );
  final idea = _note('idea', text: 'Launch idea', updatedAt: DateTime.parse('2026-10-04T09:00:00.000Z'));
  final voice = _note(
    'voice',
    text: 'ሙከራ #ስራ',
    updatedAt: DateTime.parse('2026-10-02T09:00:00.000Z'),
    audio: const NoteAudio(durationMs: 1000, transcription: TranscriptionPending()),
  );
  final binned = _note(
    'binned',
    text: 'old #work',
    favorite: true,
    trashedAt: DateTime.parse('2026-10-05T09:00:00.000Z'),
    updatedAt: DateTime.parse('2026-09-01T09:00:00.000Z'),
  );
  final entries = indexNotes([meeting, idea, voice, binned]);
  final noSearch = parseSearch('');

  group('notesInSection', () {
    test('lists everything outside the Trash, most recently edited first', () {
      expect(_ids(notesInSection(entries, NoteSection.all, noSearch)), ['idea', 'meeting', 'voice']);
    });

    test('keeps trashed notes out of every other section, favourites included', () {
      expect(_ids(notesInSection(entries, NoteSection.favorites, noSearch)), ['meeting']);
      expect(_ids(notesInSection(entries, const TagSection('work'), noSearch)), ['meeting']);
      expect(_ids(notesInSection(entries, NoteSection.trash, noSearch)), ['binned']);
    });

    test('finds untagged and voice notes', () {
      expect(_ids(notesInSection(entries, NoteSection.untagged, noSearch)), ['idea']);
      expect(_ids(notesInSection(entries, NoteSection.voice, noSearch)), ['voice']);
    });

    test('narrows a section by the search', () {
      expect(_ids(notesInSection(entries, NoteSection.all, parseSearch('ሙከራ'))), ['voice']);
      expect(_ids(notesInSection(entries, NoteSection.all, parseSearch('#ስራ'))), ['voice']);
    });
  });

  group('countSections', () {
    test('counts each section the way it lists', () {
      expect(countSections(entries, now: DateTime.parse('2026-12-01T12:00:00.000Z')), {
        FixedSectionKind.all: 3,
        FixedSectionKind.today: 0,
        FixedSectionKind.todo: 0,
        FixedSectionKind.favorites: 1,
        FixedSectionKind.untagged: 1,
        FixedSectionKind.voice: 1,
        FixedSectionKind.archive: 0,
        FixedSectionKind.trash: 1,
      });
    });
  });

  group("Bear's other sections and ordering", () {
    final now = DateTime(2026, 10, 29, 12, 0);
    final todayNote = _note('today', text: 'fresh', updatedAt: DateTime(2026, 10, 29, 9, 0).toUtc());
    final todoNote = _note('todo', text: 'list\n- [x] milk\n  - [ ] buy');
    final doneNote = _note('done', text: 'done\n- [x] x\n-[ ] not a checkbox');
    final archived = _note('archived', text: 'kept #work', archivedAt: DateTime.parse('2026-10-05T09:00:00.000Z'));
    final pinned = _note('pinned', text: 'Pinned', pinned: true, updatedAt: DateTime.parse('2026-09-01T09:00:00.000Z'));
    final diary = _note('diary', text: 'Diary\nentry');
    final more = indexNotes([todayNote, todoNote, doneNote, archived, pinned, diary]);

    test("finds today's notes and notes with open checklist items", () {
      expect(_ids(notesInSection(more, NoteSection.today, noSearch, now: now)), ['today']);
      expect(_ids(notesInSection(more, NoteSection.todo, noSearch, now: now)), ['todo']);
    });

    test('counts a note made today but edited before as today too', () {
      final created = _note(
        'created',
        createdAt: DateTime(2026, 10, 29, 8, 0),
        updatedAt: DateTime(2026, 10, 28, 8, 0),
      );

      expect(isInSection(indexNotes([created]).single, NoteSection.today, now: now), isTrue);
    });

    test('keeps archived notes out of everything but the Archive', () {
      expect(_ids(notesInSection(more, NoteSection.archive, noSearch, now: now)), ['archived']);
      expect(_ids(notesInSection(more, const TagSection('work'), noSearch, now: now)), isEmpty);
    });

    test('puts pinned notes first, then follows the chosen order', () {
      expect(_ids(notesInSection(more, NoteSection.all, noSearch, now: now)).first, 'pinned');
      // Titles A–Z after the pin, whatever their case: Diary, done, fresh, list.
      expect(_ids(notesInSection(more, NoteSection.all, noSearch, sort: SortOrder.title, now: now)), [
        'pinned',
        'diary',
        'done',
        'today',
        'todo',
      ]);
    });

    test('orders by creation when asked, keeping notes that tie in their order', () {
      final older = _note('older', createdAt: DateTime.parse('2026-09-01T09:00:00.000Z'), updatedAt: now);
      final a = _note('a');
      final b = _note('b');

      expect(_ids(notesInSection(indexNotes([older, a, b]), NoteSection.all, noSearch, sort: SortOrder.created)), [
        'a',
        'b',
        'older',
      ]);
    });

    test('lists the Trash and the Archive by when notes went there, pins not leading', () {
      final first = _note('first', pinned: true, trashedAt: DateTime.parse('2026-10-06T09:00:00.000Z'));
      final last = _note('last', trashedAt: DateTime.parse('2026-10-07T09:00:00.000Z'));

      expect(_ids(notesInSection(indexNotes([first, last]), NoteSection.trash, noSearch)), ['last', 'first']);
    });
  });

  group('sections', () {
    test('titles tags with their hash and compares tag paths', () {
      expect(sectionTitle(const TagSection('ስራ'), SectionsMessages.en), '#ስራ');
      expect(sectionTitle(NoteSection.favorites, SectionsMessages.en), 'Favorites');
      expect(sectionTitle(NoteSection.favorites, SectionsMessages.am), 'ተወዳጆች');
      expect(isSameSection(const TagSection('a'), const TagSection('a')), isTrue);
      expect(isSameSection(const TagSection('a'), const TagSection('b')), isFalse);
      expect(isSameSection(NoteSection.all, NoteSection.trash), isFalse);
      expect(isSameSection(FixedSectionKind.todo.section, const TodoSection()), isTrue);
    });
  });
}
