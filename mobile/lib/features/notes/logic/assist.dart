/// What Summarize & organize writes into a note. The desktop edits the
/// editor's document; on the phone a note is lines of plain text, so here a
/// paragraph is one line, and the summary is a line starting [summaryLabel]
/// where the desktop has a quote.
library;

import 'split_paragraphs.dart';
import 'summarize.dart';
import 'tags.dart';

/// Lines that are not prose to cut: `# headings`, `> quotes`, list and
/// checklist items (`- `, `* `, `• `, `1. `, `- [ ]`), as the desktop only cuts
/// plain paragraphs.
final _notProse = RegExp(r'^\s*(#+\s|>|[-*•]\s|\d+[.)]\s)');

bool _isSummary(String line) => line.trimLeft().startsWith(summaryLabel);

/// A line of plain prose: safe to cut into paragraphs without losing anything.
bool _isProse(String line) => line.trim().isNotEmpty && !_isSummary(line) && !_notProse.hasMatch(line);

/// Puts the summary under the note's first line (which stays its title), as
/// a line starting "ማጠቃለያ፦". Summarizing again replaces it where it is.
String insertSummary(String text, List<String> sentences) {
  if (sentences.isEmpty) return text;
  final summary = '$summaryLabel ${sentences.join(' ')}';
  final lines = text.split('\n');
  final existing = lines.indexWhere(_isSummary);
  if (existing != -1) {
    lines[existing] = summary;
  } else {
    // The title is the first line with text; blank lines above it stay above it.
    final title = lines.indexWhere((line) => line.trim().isNotEmpty);
    lines.insert(title == -1 ? lines.length : title + 1, summary);
  }
  return lines.join('\n');
}

/// Cuts each long line of prose where its topic changes, into lines of their
/// own. Returns the new text and how many lines were cut.
(String, int) splitLongParagraphs(String text) {
  var cut = 0;
  final lines = <String>[];
  for (final line in text.split('\n')) {
    final parts = _isProse(line) ? splitIntoParagraphs(line) : const <String>[];
    if (parts.length > 1) {
      cut += 1;
      lines.addAll(parts);
    } else {
      lines.add(line);
    }
  }
  return (cut == 0 ? text : lines.join('\n'), cut);
}

/// How many lines [splitLongParagraphs] would cut.
int countSplittable(String text) =>
    text.split('\n').where((line) => _isProse(line) && splitIntoParagraphs(line).length > 1).length;

/// Adds `#tag`s to the note's last line when it holds only tags (or nothing), or on a new last line.
String addTags(String text, List<String> tags) {
  if (tags.isEmpty) return text;
  final written = tags.map((tag) => '#$tag').join(' ');
  final cut = text.lastIndexOf('\n');
  final head = text.substring(0, cut + 1);
  final last = text.substring(cut + 1);
  if (holdsOnlyTags(last)) return '$head${last.trimRight()} $written';
  // An empty last line (or an empty note) is where the next words go: write into it rather than below it.
  if (last.trim().isEmpty) return '$head$written';
  return '$text\n$written';
}
