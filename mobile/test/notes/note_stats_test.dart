import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/logic/note_stats.dart';

void main() {
  group('noteStats', () {
    test('counts an empty note as nothing', () {
      expect(noteStats(''), const NoteStats(paragraphs: 0, words: 0, characters: 0, charactersWithoutSpaces: 0));
    });

    test('counts lines with text as paragraphs, skipping empty lines', () {
      expect(noteStats('የሳምንቱ ስብሰባ\n\nዛሬ ቡድኑ ተሰብስቦ ተወያየ።\nቀጣዩ ስብሰባ ሐሙስ ነው።').paragraphs, 3);
    });

    test("counts each Ge'ez syllable as one character", () {
      // ሰ ላ ም, a space, ነ ው and ።
      final stats = noteStats('ሰላም ነው።');

      expect(stats.words, 2);
      expect(stats.characters, 7);
      expect(stats.charactersWithoutSpaces, 6);
    });

    test('joins lines with one space, as a reader would see them', () {
      final stats = noteStats('ab\ncd');

      expect(stats.characters, 5);
      expect(stats.charactersWithoutSpaces, 4);
    });

    test('counts a letter with its combining mark once', () {
      expect(noteStats('é').characters, 1);
    });
  });
}
