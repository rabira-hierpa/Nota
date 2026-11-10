import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/logic/text_similarity.dart';

void main() {
  group('splitSentences', () {
    test('ends sentences at Ethiopic and Latin marks, and at line breaks', () {
      expect(splitSentences('ዛሬ ቡድኑ ተሰብስቦ ተወያየ።ቀጣዩ ስብሰባ ሐሙስ ነው። እንዴት ነህ?\nDone. Next'), [
        'ዛሬ ቡድኑ ተሰብስቦ ተወያየ።',
        'ቀጣዩ ስብሰባ ሐሙስ ነው።',
        'እንዴት ነህ?',
        'Done.',
        'Next',
      ]);
    });

    test('keeps a decimal point inside its sentence', () {
      expect(splitSentences('ዋጋው 3.5 ብር ነው። ውድ ነው።'), ['ዋጋው 3.5 ብር ነው።', 'ውድ ነው።']);
    });

    test('keeps a full stop before a lower-case word, and closing quotes with their sentence', () {
      expect(splitSentences('See e.g. the list. "Done!" he said. Next ፧ ok'), [
        'See e.g. the list.',
        '"Done!"',
        'he said.',
        'Next ፧',
        'ok',
      ]);
    });
  });

  group('wordsOf', () {
    test('drops punctuation, Ethiopic separators and bare numbers, and lower-cases Latin', () {
      expect(wordsOf('የላሊበላ ጉዞ፣ 2019 Trip!'), ['የላሊበላ', 'ጉዞ', 'trip']);
    });

    test("keeps words joined by an apostrophe or a decimal point, and splits at the Ge'ez separator", () {
      expect(wordsOf("Don't pay 3.5 birr፡ሰላም"), ["don't", 'pay', 'birr', 'ሰላም']);
    });
  });

  group('cosine', () {
    test("finds a word's forms alike, and unrelated words not", () {
      final meeting = trigramVector('ስብሰባ');
      expect(cosine(meeting, trigramVector('ስብሰባውን')), greaterThan(0.4));
      expect(cosine(meeting, trigramVector('ገበያ')), 0);
    });

    test('is 1 for the same text and 0 for empty text', () {
      expect(cosine(trigramVector('ሰላም ነው'), trigramVector('ሰላም ነው')), closeTo(1, 1e-9));
      expect(cosine(trigramVector(''), trigramVector('ሰላም')), 0);
    });
  });

  group('addNormalized', () {
    test('adds a vector at unit length', () {
      final centroid = <String, double>{};
      addNormalized(centroid, {'a': 3, 'b': 4});
      addNormalized(centroid, <String, double>{});

      expect(centroid, {'a': closeTo(0.6, 1e-9), 'b': closeTo(0.8, 1e-9)});
    });
  });
}
