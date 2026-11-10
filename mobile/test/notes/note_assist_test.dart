import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/logic/split_paragraphs.dart';
import 'package:nota/features/notes/logic/suggest_tags.dart';
import 'package:nota/features/notes/logic/summarize.dart';
import 'package:nota/features/notes/logic/tags.dart';

// A meeting transcript: four sentences about the app, then three about the budget.
const _app = [
  'ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ።',
  'መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል።',
  'ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ።',
  'የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት።',
];
const _budget = ['በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል።', 'በጀቱ ለሶስት ወር በቂ ነው።', 'ተጨማሪ በጀት ለማግኘት ማመልከቻ እንጽፋለን።'];
final _transcript = [..._app, ..._budget].join(' ');
final _meeting = 'የሳምንቱ ስብሰባ\n$_transcript';

List<TaggedText> _library(List<String> texts) => [
  for (var index = 0; index < texts.length; index += 1)
    TaggedText(id: 'note-$index', text: texts[index], tags: extractTags(texts[index])),
];

Note _note(String text) => Note(
  id: 'new',
  createdAt: DateTime.parse('2026-10-01T09:00:00.000Z'),
  updatedAt: DateTime.parse('2026-10-01T09:00:00.000Z'),
  text: text,
);

void main() {
  group('summarize', () {
    test('picks whole sentences of the note, in order, leaving out the title', () {
      final summary = summarize('$_meeting\n#ስራ');

      expect(summary.length, inInclusiveRange(1, 2));
      for (final sentence in summary) {
        expect([..._app, ..._budget], contains(sentence));
      }
      final inOrder = [...summary]..sort((a, b) => _transcript.indexOf(a) - _transcript.indexOf(b));
      expect(summary, inOrder);
    });

    test('finds the sentences about what most of the note is about', () {
      expect(summarize(_meeting).any(_app.contains), isTrue);
    });

    test('has nothing to say about a short note', () {
      expect(summarize('የገበያ ዝርዝር\nቲማቲም እና ሽንኩርት ግዛ።'), isEmpty);
    });

    test('leaves a summary added before out of the next one', () {
      final summary = summarize(_meeting);
      final again = summarize('የሳምንቱ ስብሰባ\n$summaryLabel ${summary.join(' ')}\n$_transcript');

      expect(again, summary);
    });
  });

  group('splitIntoParagraphs', () {
    test('cuts a transcript where the topic changes', () {
      expect(splitIntoParagraphs(_transcript), [_app.join(' '), _budget.join(' ')]);
    });

    test('leaves a short paragraph alone', () {
      expect(splitIntoParagraphs(_app.join(' ')), [_app.join(' ')]);
    });

    test('keeps every sentence, in order', () {
      final long = List.filled(3, _transcript).join(' ');

      expect(splitIntoParagraphs(long).join(' '), long);
    });
  });

  group('suggestTags', () {
    final notes = _library([
      'የቡድን ስብሰባ\nቡድኑ ስለ መተግበሪያው ዲዛይን ተወያየ። ቀጣዩ ስብሰባ ሰኞ ነው። #ስራ/ስብሰባ',
      'የስራ እቅድ\nበዚህ ሳምንት የመተግበሪያውን ዲዛይን እንጨርሳለን። ሙከራ እንጀምራለን። #ስራ',
      'የገበያ ዝርዝር\nቲማቲም፣ ሽንኩርት፣ ዘይት፣ ጤፍ። ገበያ ቅዳሜ። #ቤት',
      'የላሊበላ ጉዞ\nበላሊበላ አብያተ ክርስቲያናትን ጎበኘን። ጉዞው ረጅም ነበር ግን ቆንጆ ነበር። #ጉዞ',
    ]);

    test('offers the tag that notes like this one carry, nested tag rather than its parent', () {
      final tags = suggestTags(_note(_meeting), notes);

      expect(tags.first, const TagSuggestion('ስራ/ስብሰባ', TagSource.library));
      expect(tags.map((each) => each.tag), isNot(contains('ስራ')));
      expect(tags.map((each) => each.tag), isNot(contains('ጉዞ')));
    });

    test('offers words the note keeps coming back to, in their plain form', () {
      final tags = suggestTags(_note(_meeting), notes);

      expect(tags, contains(const TagSuggestion('መተግበሪያ', TagSource.keyword)));
      expect(tags, contains(const TagSuggestion('በጀት', TagSource.keyword)));
    });

    test('never offers a tag the note already has, or a common word', () {
      final tags = suggestTags(_note('$_meeting\n#ስራ/ስብሰባ'), notes).map((each) => each.tag);

      expect(tags, isNot(contains('ስራ/ስብሰባ')));
      expect(tags, isNot(contains('ወር')));
    });
  });
}
