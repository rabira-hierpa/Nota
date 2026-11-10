import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../logic/sections.dart';
import 'section_icons.dart';

/// What the note list says when it has nothing to show: why the section is
/// empty, or that the search found nothing here (with a way to look everywhere).
class EmptyNotes extends StatelessWidget {
  const EmptyNotes({super.key, required this.section, required this.query, this.onSearchAll});

  final NoteSection section;

  /// The search as typed; empty when not searching.
  final String query;

  /// Offered when a search in a section other than all notes finds nothing.
  final VoidCallback? onSearchAll;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    final colors = NotaColors.of(context);
    final textTheme = Theme.of(context).textTheme;
    final searching = query.trim().isNotEmpty;
    final text = searching
        ? messages.notes.noMatch(sectionTitle(section, messages.sections), query.trim())
        : _emptyText(section, messages.notes);
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 48, 32, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(searching ? Icons.search_off : sectionIcon(section), size: 40, color: colors.faint),
          const SizedBox(height: 16),
          Text(
            text,
            textAlign: TextAlign.center,
            style: textTheme.bodyLarge?.copyWith(color: colors.muted),
          ),
          if (searching && onSearchAll != null && section != NoteSection.all) ...[
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onSearchAll, child: Text(messages.notes.searchAll)),
          ],
        ],
      ),
    );
  }

  static String _emptyText(NoteSection section, NotesMessages messages) => switch (section) {
    AllSection() => messages.emptyAll,
    TodaySection() => messages.emptyToday,
    TodoSection() => messages.emptyTodo,
    FavoritesSection() => messages.emptyFavorites,
    UntaggedSection() => messages.emptyUntagged,
    VoiceSection() => messages.emptyVoice,
    ArchiveSection() => messages.emptyArchive,
    TrashSection() => messages.emptyTrash,
    TagSection(:final path) => messages.emptyTag(path),
  };
}
