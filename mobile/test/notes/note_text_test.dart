import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/logic/note_text.dart';

void main() {
  group('noteTitle and notePreview', () {
    const text = '\n  የስብሰባ ማስታወሻ \n\nዛሬ ከሰዓት\nበ #ስራ ቢሮ  ';

    test('takes the first line as the title', () {
      expect(noteTitle(text), 'የስብሰባ ማስታወሻ');
      expect(firstLine(text), 'የስብሰባ ማስታወሻ');
    });

    test('flattens the rest into the preview', () {
      expect(notePreview(text), 'ዛሬ ከሰዓት በ #ስራ ቢሮ');
    });

    test('cuts a long first line, like a transcript, into a title and a preview', () {
      final transcript = '${'ሰላም ዓለም ' * 6}ይህ ረጅም ነው። ${'ቀጣዩ ዓረፍተ ነገር ' * 6}';

      expect(noteTitle(transcript), '${'ሰላም ዓለም ' * 6}ይህ ረጅም ነው።');
      expect(notePreview(transcript), ('ቀጣዩ ዓረፍተ ነገር ' * 6).trim());
      expect(noteTitle('ሀ' * 100), '${'ሀ' * 80}…');
      expect(firstLine(transcript), transcript.trim());
    });

    test('leaves a # heading marker out of the title, but not a #tag', () {
      expect(noteTitle('# የስብሰባ ማስታወሻ\nዛሬ'), 'የስብሰባ ማስታወሻ');
      expect(firstLine('\n### Plan'), 'Plan');
      expect(noteTitle('#ስራ ዛሬ'), '#ስራ ዛሬ');
      expect(noteTitle('#'), '#');
    });

    test('is empty for an empty note', () {
      expect(noteTitle('  \n'), '');
      expect(notePreview('only a title'), '');
    });

    test('keeps the preview short', () {
      expect(notePreview('title\n${'ቃል ' * 200}').length, maxPreviewLength);
    });
  });

  group('wordCount', () {
    test("counts words split by spaces or the Ge'ez separator", () {
      expect(wordCount('ሰላም ዓለም፡እንዴት\nነህ'), 4);
      expect(wordCount('   '), 0);
    });
  });

  group('compareText', () {
    test('orders by letter before case, punctuation and digits before letters', () {
      final words = ['list', 'Diary', 'done', '2 days', '(draft)', 'fresh', 'diary'];

      expect(words..sort(compareText), ['(draft)', '2 days', 'diary', 'Diary', 'done', 'fresh', 'list']);
    });

    test("puts Latin before Ge'ez, and Ge'ez in its own order", () {
      final words = ['መስከረም', 'ለሊት', 'apple', 'ሀገር'];

      expect(words..sort(compareText), ['apple', 'ሀገር', 'ለሊት', 'መስከረም']);
    });

    test('sorts accented letters with their plain letter, plain first, then by case', () {
      final words = ['zebra', 'Résumé', 'émile', 'resume', 'Ébène', 'eagle', 'résumé', 'Resume'];

      expect(words..sort(compareText), ['eagle', 'Ébène', 'émile', 'resume', 'Resume', 'résumé', 'Résumé', 'zebra']);
    });

    test('orders punctuation as the desktop does', () {
      final words = ['#tag', '(draft)', '-dash', '_under', ' space', r'$5', '“quote”', '፡ ቃል'];

      expect(words..sort(compareText), [' space', '_under', '-dash', '፡ ቃል', '“quote”', '(draft)', '#tag', r'$5']);
    });

    test('can ignore case', () {
      expect(compareText('Plan', 'plan', ignoreCase: true), 0);
      expect(compareText('Plan', 'plan'), isNot(0));
    });
  });
}
