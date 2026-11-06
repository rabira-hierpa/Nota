import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/logic/assist.dart';
import 'package:nota/features/notes/logic/split_paragraphs.dart';
import 'package:nota/features/notes/logic/summarize.dart';

// Four sentences about the app, then three about the budget: one line, as a transcript arrives.
const _app = [
  'ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ።',
  'መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል።',
  'ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ።',
  'የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት።',
];
const _budget = ['በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል።', 'በጀቱ ለሶስት ወር በቂ ነው።', 'ተጨማሪ በጀት ለማግኘት ማመልከቻ እንጽፋለን።'];
final _transcript = [..._app, ..._budget].join(' ');

void main() {
  group('insertSummary', () {
    test('puts the summary under the first line, which stays the title', () {
      expect(insertSummary('Title\nbody', ['One.', 'Two.']), 'Title\n$summaryLabel One. Two.\nbody');
    });

    test('keeps blank lines above the title above it', () {
      expect(insertSummary('\n  Title\nbody', ['One.']), '\n  Title\n$summaryLabel One.\nbody');
    });

    test('replaces a summary added before, where it is', () {
      final once = insertSummary('Title\nbody', ['One.']);
      final moved = '$once\nmore'.replaceFirst('Title\n', 'Title\nintro\n');

      expect(insertSummary(moved, ['Two.']), 'Title\nintro\n$summaryLabel Two.\nbody\nmore');
    });

    test('changes nothing without sentences', () {
      expect(insertSummary('Title\nbody', []), 'Title\nbody');
    });

    test('writes into an empty note', () {
      expect(insertSummary('', ['One.']), '\n$summaryLabel One.');
    });
  });

  group('splitLongParagraphs', () {
    test('cuts each long line of prose where its topic changes, into lines of their own', () {
      final text = 'ስብሰባ\n$_transcript\n#ስራ';

      expect(splitLongParagraphs(text), ('ስብሰባ\n${_app.join(' ')}\n${_budget.join(' ')}\n#ስራ', 1));
      expect(countSplittable(text), 1);
    });

    test('counts every line it cuts', () {
      final text = '$_transcript\n\n$_transcript';
      final (split, count) = splitLongParagraphs(text);

      expect(count, 2);
      expect(split.split('\n'), hasLength(5));
      expect(countSplittable(text), 2);
    });

    test('leaves short lines, lists, headings, quotes and the summary alone', () {
      final text = [
        'Title',
        _app.join(' '),
        '- $_transcript',
        '- [ ] $_transcript',
        '1. $_transcript',
        '# $_transcript',
        '> $_transcript',
        '$summaryLabel $_transcript',
      ].join('\n');

      expect(splitIntoParagraphs(_transcript), hasLength(2));
      expect(splitLongParagraphs(text), (text, 0));
      expect(countSplittable(text), 0);
    });
  });

  group('addTags', () {
    test('adds tags to a last line that holds only tags', () {
      expect(addTags('Title\nbody\n#ስራ ', ['plan', 'ስብሰባ']), 'Title\nbody\n#ስራ #plan #ስብሰባ');
    });

    test('writes into an empty last line, or an empty note', () {
      expect(addTags('Title\nbody\n', ['plan']), 'Title\nbody\n#plan');
      expect(addTags('', ['plan']), '#plan');
    });

    test('puts them on a new last line after text', () {
      expect(addTags('Title\nbody #ስራ', ['plan']), 'Title\nbody #ስራ\n#plan');
    });

    test('changes nothing without tags', () {
      expect(addTags('Title', []), 'Title');
    });
  });
}
