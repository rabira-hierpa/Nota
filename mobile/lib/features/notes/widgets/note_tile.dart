import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../../speech/widgets/transcription_chip.dart';
import '../data/note.dart';
import '../logic/format.dart';
import '../logic/note_text.dart';
import 'highlighted_text.dart';

/// One row of the note list: the title (the first line), a two-line preview
/// of what follows, the date, and small marks for pinned, favourite and
/// recorded notes. Search words are marked in the title and preview.
class NoteTile extends StatelessWidget {
  const NoteTile({
    super.key,
    required this.note,
    required this.calendar,
    required this.onTap,
    this.onLongPress,
    this.searchTerms = const [],
    this.showCreated = false,
  });

  final Note note;
  final CalendarChoice calendar;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final List<String> searchTerms;

  /// Show when the note was made rather than last edited (the list is sorted by it).
  final bool showCreated;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    final colors = NotaColors.of(context);
    final textTheme = Theme.of(context).textTheme;
    final title = noteTitle(note.text);
    final preview = notePreview(note.text);
    final date = formatListDate(showCreated ? note.createdAt : note.updatedAt, calendar, messages.dates);
    final markStyle = IconThemeData(size: 16, color: colors.muted);

    // One button for screen readers: title, preview, date and marks read together.
    return MergeSemantics(
      child: Semantics(
        button: true,
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 64),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 16, 12),
              child: IconTheme(
                data: markStyle,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: title.isEmpty
                              ? Text(
                                  note.audio != null ? messages.notes.voiceNote : messages.common.untitled,
                                  style: textTheme.titleMedium?.copyWith(color: colors.muted),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                )
                              : HighlightedText(title, terms: searchTerms, style: textTheme.titleMedium, maxLines: 2),
                        ),
                        if (note.pinned) _Mark(icon: Icons.push_pin, label: messages.notes.pinned),
                        if (note.favorite) _Mark(icon: Icons.star, label: messages.notes.favorite),
                      ],
                    ),
                    if (preview.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: HighlightedText(
                          preview,
                          terms: searchTerms,
                          style: textTheme.bodyMedium?.copyWith(color: colors.muted),
                          maxLines: 2,
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(date, style: textTheme.bodySmall),
                          if (note.audio != null) ...[
                            _Mark(icon: Icons.mic_none, label: messages.notes.hasRecording),
                            TranscriptionChip(note: note),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A small icon that says what it means to screen readers.
class _Mark extends StatelessWidget {
  const _Mark({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.only(start: 6, top: 3),
    child: Icon(icon, semanticLabel: label),
  );
}
