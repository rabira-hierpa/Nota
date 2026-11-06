import 'dart:math' as math;

import '../data/note.dart';
import 'sections.dart';
import 'tags.dart';
import 'text_similarity.dart';

/// Where a suggested tag comes from.
enum TagSource {
  /// A tag the notes most like this one carry.
  library,

  /// A word this note keeps coming back to, offered as a new tag.
  keyword,
}

/// A tag the assistant offers for a note.
class TagSuggestion {
  const TagSuggestion(this.tag, this.source);

  final String tag;
  final TagSource source;

  @override
  bool operator ==(Object other) => other is TagSuggestion && other.tag == tag && other.source == source;

  @override
  int get hashCode => Object.hash(tag, source);

  @override
  String toString() => 'TagSuggestion(${source.name})';
}

/// A note, as the suggestions read it: its plain text and the tags in it.
class TaggedText {
  const TaggedText({required this.id, required this.text, required this.tags});

  final String id;
  final String text;
  final List<String> tags;
}

/// What tag suggestions compare a note with: every note outside the Trash.
List<TaggedText> taggedTexts(List<IndexedNote> entries) => [
  for (final entry in entries)
    if (!entry.note.isTrashed) TaggedText(id: entry.note.id, text: entry.note.text, tags: entry.tags),
];

/// A tag's notes must be at least this like the note for the tag to be offered.
const _minTagLikeness = 0.2;
const _maxLibraryTags = 3;
const _maxKeywords = 3;

/// A keyword appears at least this often in the note.
const _minKeywordCount = 2;

/// Ge'ez letters are syllables: two make a word (ቤት), where Latin needs four.
const _minEthiopicLetters = 2;
const _minLatinLetters = 4;
final _ethiopic = RegExp(r'\p{Script=Ethiopic}', unicode: true);

/// Prepositions written onto the word (የ-, በ-, ለ-, ከ-, እንደ-, ስለ-), and endings (-ን, -ም, -ና, -ው, -ዋ).
const _prefixes = ['እንደ', 'ስለ', 'የ', 'በ', 'ለ', 'ከ'];
const _suffixes = ['ን', 'ም', 'ና', 'ው', 'ዋ'];

/// Words that say little about what a note is about.
const _stopWords = {
  'እና', 'ነው', 'ናቸው', 'ነበር', 'ነበሩ', 'ነኝ', 'ነህ', 'ነሽ', 'ነን', 'ናችሁ', 'አለ', 'አሉ', 'አለች', 'አለኝ', 'አለበት', //
  'የለም', 'የሉም', 'ላይ', 'ውስጥ', 'ወደ', 'ጋር', 'ስለ', 'እንደ', 'ግን', 'ወይም', 'ደግሞ', 'ብቻ', 'ሁሉ', 'ሁሉም', //
  'ይህ', 'ይህን', 'ይሄ', 'ያ', 'ያንን', 'እነዚህ', 'እነዚያ', 'እኔ', 'አንተ', 'አንቺ', 'እሱ', 'እሷ', 'እርሱ', 'እርሷ', //
  'እኛ', 'እናንተ', 'እነሱ', 'እርስዎ', 'ምን', 'ማን', 'እንዴት', 'የት', 'መቼ', 'ለምን', 'ስንት', 'በጣም', 'አንድ', //
  'ሁለት', 'ሌላ', 'ሌሎች', 'ምክንያቱም', 'ስለዚህ', 'ከዚያ', 'ከዚህ', 'እዚህ', 'እዚያ', 'አሁን', 'ገና', 'ቢሆንም', //
  'እንጂ', 'ነገር', 'ጊዜ', 'ሆነ', 'ሆኖ', 'ይሆናል', 'ወዘተ', 'በኋላ', 'በፊት', 'ዛሬ', 'ነገ', 'ትናንት', 'ቀን', 'ሳምንት', //
  'ወር', 'ዓመት', 'አመት', 'ሰዓት', 'ደቂቃ', //
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'were', 'they', 'their', 'there', 'about', 'would', //
  'will', 'what', 'when', 'which', 'your', 'into', 'also', 'been', 'than', 'then', 'them', 'just', 'some',
};

bool _longEnough(String word) {
  final count = letters(word).length;
  return _ethiopic.hasMatch(word) ? count >= _minEthiopicLetters : count >= _minLatinLetters;
}

/// One affix off each end, while a word of two letters or more is left: ለስብሰባውን → ስብሰባ.
String _stem(String word) {
  var parts = letters(word);
  final whole = parts.join();
  final prefix = _prefixes.where(whole.startsWith).firstOrNull;
  if (prefix != null && parts.length - letters(prefix).length >= 3) parts = parts.sublist(letters(prefix).length);
  for (final suffix in _suffixes) {
    if (parts.length > 3 && parts.last == suffix) parts = parts.sublist(0, parts.length - 1);
  }
  return parts.join();
}

/// The text without its `#tags`, so a tag's own word doesn't make notes look alike.
String _withoutTags(String text) {
  final result = StringBuffer();
  var from = 0;
  for (final match in findTags(text)) {
    result.write(text.substring(from, match.start));
    from = match.end;
  }
  result.write(text.substring(from));
  return result.toString();
}

/// The indexes of [scores] from highest to lowest; on a tie the earlier one (Dart's sort isn't stable).
List<int> _highestFirst(List<double> scores) => List<int>.generate(scores.length, (index) => index)
  ..sort((a, b) {
    final byValue = scores[b].compareTo(scores[a]);
    return byValue != 0 ? byValue : a - b;
  });

/// Tags already in use whose notes read most like this one.
List<TagSuggestion> _libraryTags(TermVector vector, List<String> own, List<TaggedText> others) {
  final centroids = <String, TermVector>{};
  for (final other in others) {
    final otherVector = trigramVector(_withoutTags(other.text));
    for (final tag in other.tags) {
      addNormalized(centroids.putIfAbsent(tag, () => <String, double>{}), otherVector);
    }
  }
  final alike = [
    for (final MapEntry(key: tag, value: centroid) in centroids.entries)
      if (!own.contains(tag)) (tag: tag, likeness: cosine(vector, centroid)),
  ].where((each) => each.likeness >= _minTagLikeness).toList();
  // #work/meetings says #work too: offer the nested tag rather than both.
  final leaves = alike
      .where((each) => !alike.any((other) => other.tag.startsWith('${each.tag}$tagSeparator')))
      .toList();
  return [
    for (final index in _highestFirst([for (final each in leaves) each.likeness]).take(_maxLibraryTags))
      TagSuggestion(leaves[index].tag, TagSource.library),
  ];
}

/// How often a word's stem comes up, and its shortest written form.
class _WordForms {
  _WordForms(this.shortest);

  int count = 0;
  String shortest;
}

/// Words this note repeats that other notes rarely use, each in its shortest written form.
List<TagSuggestion> _keywordTags(String body, List<String> own, List<TaggedText> others) {
  final forms = <String, _WordForms>{};
  for (final word in wordsOf(body)) {
    if (_stopWords.contains(word) || !_longEnough(word)) continue;
    final entry = forms.putIfAbsent(_stem(word), () => _WordForms(word));
    entry.count += 1;
    if (letters(word).length < letters(entry.shortest).length) entry.shortest = word;
  }
  final otherStems = [
    for (final other in others) {for (final word in wordsOf(other.text)) _stem(word)},
  ];
  final keywords = [
    for (final MapEntry(key: key, value: form) in forms.entries)
      if (form.count >= _minKeywordCount && !own.contains(form.shortest) && !_stopWords.contains(_stem(form.shortest)))
        (
          tag: form.shortest,
          score:
              form.count *
              math.log((others.length + 1) / (otherStems.where((stems) => stems.contains(key)).length + 1) + 1),
        ),
  ];
  return [
    for (final index in _highestFirst([for (final each in keywords) each.score]).take(_maxKeywords))
      TagSuggestion(keywords[index].tag, TagSource.keyword),
  ];
}

/// Tags for a note: first the library's own tags that notes like it carry
/// (so it files in with them), then words it keeps returning to, as new tags.
/// Plain counting on the phone; nothing leaves it.
List<TagSuggestion> suggestTags(Note note, List<TaggedText> library) {
  final own = extractTags(note.text);
  final body = _withoutTags(note.text);
  final others = library.where((other) => other.id != note.id).toList();
  final fromLibrary = _libraryTags(trigramVector(body), own, others);
  final keywords = _keywordTags(
    body,
    own,
    others,
  ).where((keyword) => !fromLibrary.any((suggestion) => suggestion.tag.split(tagSeparator).contains(keyword.tag)));
  return [...fromLibrary, ...keywords];
}
