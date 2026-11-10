import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../l10n/messages.dart';
import '../data/note.dart';

/// What can be done to a note from its row or its screen. The list's
/// long-press sheet and the editor's menu both offer these, so a swipe is
/// never the only way to do something.
enum NoteAction { pin, unpin, favorite, unfavorite, archive, unarchive, trash, restore, deleteForever }

/// The actions that apply to [note] now, in menu order.
List<NoteAction> noteActionsFor(Note note) => note.isTrashed
    ? const [NoteAction.restore, NoteAction.deleteForever]
    : [
        if (!note.isArchived) note.pinned ? NoteAction.unpin : NoteAction.pin,
        note.favorite ? NoteAction.unfavorite : NoteAction.favorite,
        note.isArchived ? NoteAction.unarchive : NoteAction.archive,
        NoteAction.trash,
      ];

String noteActionLabel(NoteAction action, Messages messages) => switch (action) {
  NoteAction.pin => messages.editor.pin,
  NoteAction.unpin => messages.editor.unpin,
  NoteAction.favorite => messages.editor.addFavorite,
  NoteAction.unfavorite => messages.editor.removeFavorite,
  NoteAction.archive => messages.editor.archive,
  NoteAction.unarchive => messages.editor.unarchive,
  NoteAction.trash => messages.editor.trash,
  NoteAction.restore => messages.editor.restore,
  NoteAction.deleteForever => messages.editor.deleteForever,
};

IconData noteActionIcon(NoteAction action) => switch (action) {
  NoteAction.pin => Icons.push_pin_outlined,
  NoteAction.unpin => Icons.push_pin,
  NoteAction.favorite => Icons.star_outline,
  NoteAction.unfavorite => Icons.star,
  NoteAction.archive => Icons.archive_outlined,
  NoteAction.unarchive => Icons.unarchive_outlined,
  NoteAction.trash => Icons.delete_outline,
  NoteAction.restore => Icons.restore_from_trash_outlined,
  NoteAction.deleteForever => Icons.delete_forever_outlined,
};

/// Does [action] to the note with [noteId] and says what happened; moving to
/// the Trash can be undone from the message. Deleting for good asks first.
/// Returns false when the person backed out of a confirmation.
Future<bool> runNoteAction(BuildContext context, String noteId, NoteAction action) async {
  final store = AppScope.of(context).notes;
  final messages = Messages.of(context);
  final messenger = ScaffoldMessenger.of(context);
  void say(String text, {SnackBarAction? undo}) => messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text), action: undo));

  switch (action) {
    case NoteAction.pin || NoteAction.unpin:
      await store.pin(noteId, value: action == NoteAction.pin);
    case NoteAction.favorite || NoteAction.unfavorite:
      await store.favorite(noteId, value: action == NoteAction.favorite);
    case NoteAction.archive:
      say(messages.notes.archived);
      await store.archive(noteId);
    case NoteAction.unarchive:
      say(messages.notes.unarchived);
      await store.unarchive(noteId);
    case NoteAction.trash:
      say(
        messages.notes.movedToTrash,
        undo: SnackBarAction(label: messages.common.undo, onPressed: () => unawaited(store.restore(noteId))),
      );
      await store.trash(noteId);
    case NoteAction.restore:
      say(messages.notes.restored);
      await store.restore(noteId);
    case NoteAction.deleteForever:
      final confirmed = await confirmDeleteForever(context);
      if (!confirmed) return false;
      say(messages.notes.deletedForever);
      await store.deleteForever(noteId);
  }
  return true;
}

/// Asks before a note and its recording are deleted for good.
Future<bool> confirmDeleteForever(BuildContext context) => confirmDestructive(
  context,
  message: Messages.of(context).editor.confirmDelete,
  confirmLabel: Messages.of(context).editor.deleteForever,
);

/// A yes-or-no question before something that can't be undone. The
/// destructive choice is the second button, in the warning colour.
Future<bool> confirmDestructive(BuildContext context, {required String message, required String confirmLabel}) async {
  final messages = Messages.of(context);
  final answer = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(messages.common.cancel)),
        TextButton(
          style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
          onPressed: () => Navigator.pop(context, true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return answer ?? false;
}
