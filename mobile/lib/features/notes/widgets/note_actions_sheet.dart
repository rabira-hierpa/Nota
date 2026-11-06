import 'dart:async';

import 'package:flutter/material.dart';

import '../../../l10n/messages.dart';
import '../data/note.dart';
import '../logic/note_text.dart';
import 'note_actions.dart';

/// The actions for one note in the list, from a long press.
Future<void> showNoteActionsSheet(BuildContext context, Note note) => showModalBottomSheet<void>(
  context: context,
  useSafeArea: true,
  builder: (_) =>
      NoteActionsSheet(note: note, onAction: (action) => unawaited(runNoteAction(context, note.id, action))),
);

class NoteActionsSheet extends StatelessWidget {
  const NoteActionsSheet({super.key, required this.note, required this.onAction});

  final Note note;

  /// Runs with the list's context, after the sheet has closed.
  final ValueChanged<NoteAction> onAction;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    final title = noteTitle(note.text);
    return ListView(
      shrinkWrap: true,
      padding: const EdgeInsets.only(bottom: 16),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
          child: Text(
            title.isEmpty ? messages.common.untitled : title,
            style: Theme.of(context).textTheme.titleMedium,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        for (final action in noteActionsFor(note))
          ListTile(
            leading: Icon(noteActionIcon(action)),
            title: Text(noteActionLabel(action, messages)),
            onTap: () {
              Navigator.pop(context);
              onAction(action);
            },
          ),
      ],
    );
  }
}
