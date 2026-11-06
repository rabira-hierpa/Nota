import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../logic/note_links.dart';
import '../logic/tags.dart';

/// A line starting with a `# ` heading marker (up to six #s), as note_text.dart reads titles.
final _heading = RegExp(r'^#{1,6}[ \t]+', multiLine: true);

/// What a stretch of text is marked as. A stretch can be several at once
/// (a tag inside a heading that matches the search).
enum _Mark { heading, headingMarker, tag, link, match, composing }

/// The note's text field: plain text, styled as it is read. `#tags` get a
/// soft accent background, `[[links]]` the accent colour, `# ` lines the
/// heading style, and search matches the highlight. Only styles change, never
/// the characters, so every caret position maps one to one onto the text.
class NoteTextController extends TextEditingController {
  NoteTextController({super.text, this._searchTerms = const []});

  List<String> _searchTerms;

  /// Lower-case words to mark, from the note list's search.
  List<String> get searchTerms => _searchTerms;

  set searchTerms(List<String> terms) {
    _searchTerms = terms;
    notifyListeners();
  }

  @override
  TextSpan buildTextSpan({required BuildContext context, TextStyle? style, required bool withComposing}) {
    final text = value.text;
    final base = style ?? const TextStyle();
    if (text.isEmpty) return TextSpan(style: base, text: text);
    final composing = withComposing && value.isComposingRangeValid ? value.composing : TextRange.empty;
    final marks = _noteMarks(text, _searchTerms, composing: composing);
    return TextSpan(style: base, children: _spans(text, marks, base, NotaColors.of(context)));
  }

  List<TextSpan> _spans(String text, List<_Range> marks, TextStyle base, NotaColors colors) {
    final cuts = <int>{0, text.length};
    for (final mark in marks) {
      cuts
        ..add(mark.start)
        ..add(mark.end);
    }
    final ordered = cuts.toList()..sort();
    final spans = <TextSpan>[];
    var first = 0;
    for (var index = 0; index + 1 < ordered.length; index += 1) {
      final start = ordered[index];
      final end = ordered[index + 1];
      // Marks are sorted by start: those that ended before this stretch can be skipped for good.
      while (first < marks.length && marks[first].end <= start) {
        first += 1;
      }
      final active = <_Mark>{
        for (var at = first; at < marks.length && marks[at].start < end; at += 1)
          if (marks[at].end > start) marks[at].kind,
      };
      spans.add(TextSpan(text: text.substring(start, end), style: _styleFor(active, base, colors)));
    }
    return spans;
  }

  static TextStyle? _styleFor(Set<_Mark> marks, TextStyle base, NotaColors colors) {
    if (marks.isEmpty) return null;
    var style = const TextStyle();
    if (marks.contains(_Mark.heading)) {
      style = style.merge(
        TextStyle(
          fontSize: NotaText.noteHeading.fontSize,
          height: NotaText.noteHeading.height,
          fontWeight: NotaText.noteHeading.fontWeight,
        ),
      );
    }
    // Muted, not faint: the marker is typed text and must stay readable (4.5:1).
    if (marks.contains(_Mark.headingMarker)) style = style.copyWith(color: colors.muted);
    if (marks.contains(_Mark.link)) style = style.copyWith(color: colors.accentInk);
    if (marks.contains(_Mark.tag)) style = style.copyWith(color: colors.accentInk, backgroundColor: colors.accentSoft);
    if (marks.contains(_Mark.match)) style = style.copyWith(backgroundColor: colors.mark);
    if (marks.contains(_Mark.composing)) style = style.copyWith(decoration: TextDecoration.underline);
    return style;
  }
}

/// One marked stretch of the text, [start] inclusive, [end] exclusive.
class _Range {
  const _Range(this.start, this.end, this.kind);

  final int start;
  final int end;
  final _Mark kind;
}

/// Where each mark falls in [text], sorted by start. Kept apart from the
/// controller so it is cheap to test; offsets are `String` (UTF-16) indexes.
@visibleForTesting
List<({int start, int end, String kind})> describeMarks(
  String text,
  List<String> searchTerms, {
  TextRange composing = TextRange.empty,
}) => [
  for (final mark in _noteMarks(text, searchTerms, composing: composing))
    (start: mark.start, end: mark.end, kind: mark.kind.name),
];

List<_Range> _noteMarks(String text, List<String> searchTerms, {TextRange composing = TextRange.empty}) {
  final marks = <_Range>[
    for (final match in _heading.allMatches(text)) ...[
      _Range(match.start, _lineEnd(text, match.start), _Mark.heading),
      _Range(match.start, match.end, _Mark.headingMarker),
    ],
    for (final tag in findTags(text)) _Range(tag.start, tag.end, _Mark.tag),
    for (final link in findLinks(text)) _Range(link.start, link.end, _Mark.link),
    ..._matches(text, searchTerms),
    if (composing.isValid && !composing.isCollapsed && composing.end <= text.length)
      _Range(composing.start, composing.end, _Mark.composing),
  ];
  return marks..sort((a, b) => a.start != b.start ? a.start - b.start : a.end - b.end);
}

int _lineEnd(String text, int from) {
  final end = text.indexOf('\n', from);
  return end == -1 ? text.length : end;
}

/// Each place a search word appears, without case. Like the note list's
/// highlight, nothing is marked when lower-casing changes the text's length.
Iterable<_Range> _matches(String text, List<String> terms) sync* {
  if (terms.isEmpty) return;
  final lower = text.toLowerCase();
  if (lower.length != text.length) return;
  for (final term in terms) {
    if (term.isEmpty) continue;
    for (var at = lower.indexOf(term); at != -1; at = lower.indexOf(term, at + term.length)) {
      yield _Range(at, at + term.length, _Mark.match);
    }
  }
}
