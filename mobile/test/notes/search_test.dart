import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/logic/search.dart';

void main() {
  group('parseSearch', () {
    test('separates words from #tags', () {
      expect(parseSearch('  ስብሰባ #Work  Plan '), const SearchQuery(terms: ['ስብሰባ', 'plan'], tags: ['work']));
    });

    test('treats a lone # as a word and nothing as empty', () {
      expect(parseSearch('#'), const SearchQuery(terms: ['#']));
      expect(isEmptySearch(parseSearch('   ')), isTrue);
    });
  });

  group('matchesSearch', () {
    const text = 'ስብሰባ ዛሬ ከሰዓት\nPlan the launch';

    test('needs every word, in any case and order', () {
      expect(matchesSearch(text, [], parseSearch('launch ስብሰባ')), isTrue);
      expect(matchesSearch(text, [], parseSearch('launch ነገ')), isFalse);
    });

    test('matches a tag and its nested tags', () {
      expect(matchesSearch(text, ['work/meetings'], parseSearch('#work')), isTrue);
      expect(matchesSearch(text, ['home'], parseSearch('#work')), isFalse);
    });
  });

  group('highlightParts', () {
    test('marks each occurrence, merging overlaps', () {
      expect(highlightParts('Plan a planet', ['plan', 'lane']), const [
        TextPart('Plan', match: true),
        TextPart(' a ', match: false),
        TextPart('plane', match: true),
        TextPart('t', match: false),
      ]);
    });

    test('highlights Amharic', () {
      expect(highlightParts('ሰላም ዓለም', ['ዓለም']), const [TextPart('ሰላም ', match: false), TextPart('ዓለም', match: true)]);
    });

    test('returns the text whole when nothing is searched', () {
      expect(highlightParts('ሰላም', []), const [TextPart('ሰላም', match: false)]);
    });
  });
}
