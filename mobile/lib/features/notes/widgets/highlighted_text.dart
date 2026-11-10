import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../logic/search.dart';

/// Text with the search words marked, as in the note list's titles and previews.
class HighlightedText extends StatelessWidget {
  const HighlightedText(this.text, {super.key, this.terms = const [], this.style, this.maxLines});

  final String text;

  /// Lower-case words to mark.
  final List<String> terms;
  final TextStyle? style;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    final mark = TextStyle(backgroundColor: NotaColors.of(context).mark);
    final parts = highlightParts(text, terms);
    return Text.rich(
      TextSpan(
        children: [for (final part in parts) TextSpan(text: part.text, style: part.match ? mark : null)],
      ),
      style: style,
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
    );
  }
}
