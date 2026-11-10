import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/logic/note_links.dart';

Note _note(String id, String text, {DateTime? updatedAt, DateTime? trashedAt}) => Note(
  id: id,
  createdAt: DateTime.parse('2026-10-01T09:00:00.000Z'),
  updatedAt: updatedAt ?? DateTime.parse('2026-10-01T09:00:00.000Z'),
  text: text,
  trashedAt: trashedAt,
);

void main() {
  group('findLinks', () {
    test('finds [[titles]] with their positions, in Amharic too', () {
      expect(findLinks('ይመልከቱ [[የስብሰባ ማስታወሻ]] እና [[ Plan ]]'), const [
        LinkMatch(title: 'የስብሰባ ማስታወሻ', start: 6, end: 21),
        LinkMatch(title: 'Plan', start: 25, end: 35),
      ]);
    });

    test('ignores empty brackets and links across lines', () {
      expect(findLinks('[[]] and [[half\nway]]'), isEmpty);
    });
  });

  group('findLinkedNote and backlinksTo', () {
    final meeting = _note('meeting', 'የስብሰባ ማስታወሻ\nዛሬ');
    final plan = _note('plan', 'Plan\nsee [[የስብሰባ ማስታወሻ]]');
    final binned = _note('binned', 'Old\n[[የስብሰባ ማስታወሻ]]', trashedAt: DateTime.parse('2026-10-02T09:00:00.000Z'));
    final notes = [meeting, plan, binned];

    test('opens the note whose first line is the title, ignoring case and space', () {
      expect(findLinkedNote(notes, ' plan ')?.id, 'plan');
      expect(findLinkedNote(notes, 'Nowhere'), isNull);
    });

    test('opens the newest of two notes with the same title, never one in the Trash', () {
      final newer = _note('newer', 'plan\nagain', updatedAt: DateTime.parse('2026-10-05T09:00:00.000Z'));
      final binnedNewest = _note(
        'binned-plan',
        'Plan',
        updatedAt: DateTime.parse('2026-10-09T09:00:00.000Z'),
        trashedAt: DateTime.parse('2026-10-09T09:00:00.000Z'),
      );

      expect(findLinkedNote([plan, newer, binnedNewest], 'Plan')?.id, 'newer');
    });

    test('finds a note whose title is a # heading', () {
      final heading = _note('heading', '# Agenda\nfirst');

      expect(findLinkedNote([heading], 'agenda')?.id, 'heading');
      expect(backlinksTo([heading, _note('linker', 'see [[Agenda]]')], heading).map((each) => each.id), ['linker']);
    });

    test('lists the notes that link here, leaving out trashed ones', () {
      expect(backlinksTo(notes, meeting).map((each) => each.id), ['plan']);
      expect(backlinksTo(notes, _note('empty', '')), isEmpty);
    });
  });
}
