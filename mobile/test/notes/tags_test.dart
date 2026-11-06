import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/logic/tags.dart';

/// A tree as plain values, so `expect` can compare it.
Object? _shape(List<TagNode> nodes) => [
  for (final node in nodes) [node.name, node.path, node.count, _shape(node.children)],
];

void main() {
  group('findTags', () {
    test('finds Amharic, Latin and nested tags with their positions', () {
      const text = 'ስብሰባ #ስራ ዛሬ\n#Work/Meetings (#idea)';

      expect(findTags(text), const [
        TagMatch(tag: 'ስራ', start: 5, end: 8),
        TagMatch(tag: 'work/meetings', start: 12, end: 26),
        TagMatch(tag: 'idea', start: 28, end: 33),
      ]);
    });

    test('stops at Ethiopic punctuation', () {
      expect(extractTags('ጨርሻለሁ #ስራ።'), ['ስራ']);
    });

    test('ignores anchors, numbers and a lone hash', () {
      expect(extractTags('see site.com/#anchor, item #2024, a # b, C#'), isEmpty);
    });

    test('lists each tag once, whatever its case', () {
      expect(extractTags('#Ideas and #ideas'), ['ideas']);
    });

    test('takes a # heading for a heading, not a tag', () {
      expect(extractTags('# ስብሰባ\n## Plan'), isEmpty);
    });
  });

  group('hasTag', () {
    test('matches the tag and everything nested under it, but not lookalikes', () {
      expect(hasTag(['work/meetings'], 'work'), isTrue);
      expect(hasTag(['work'], 'work'), isTrue);
      expect(hasTag(['workshop'], 'work'), isFalse);
    });
  });

  group('holdsOnlyTags', () {
    test('is true for a line of tags and nothing else', () {
      expect(holdsOnlyTags('  #ስራ #work/plans '), isTrue);
      expect(holdsOnlyTags('#ስራ ዛሬ'), isFalse);
      expect(holdsOnlyTags('   '), isFalse);
      expect(holdsOnlyTags('#2024'), isFalse);
    });
  });

  group('buildTagTree', () {
    test('nests tags, counts notes per branch and adds implied parents', () {
      final tree = buildTagTree([
        ['work/meetings', 'ስራ'],
        ['work/meetings'],
        ['work/plans'],
      ]);

      expect(_shape(tree), [
        [
          'work',
          'work',
          3,
          [
            ['meetings', 'work/meetings', 2, <Object?>[]],
            ['plans', 'work/plans', 1, <Object?>[]],
          ],
        ],
        ['ስራ', 'ስራ', 1, <Object?>[]],
      ]);
    });
  });
}
