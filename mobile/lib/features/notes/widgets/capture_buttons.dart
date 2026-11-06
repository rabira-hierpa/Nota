import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/messages.dart';

/// The two ways to start a note, at the thumb: a large record button (the
/// one place the record colour is used) and a smaller "new note" above it.
class CaptureButtons extends StatelessWidget {
  const CaptureButtons({super.key, required this.onRecord, required this.onNewNote});

  final VoidCallback onRecord;
  final VoidCallback onNewNote;

  /// Between Material's regular (56) and large (96) buttons: easy to hit, not covering the list.
  static const _recordSize = 72.0;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    final colors = NotaColors.of(context);
    final scheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        FloatingActionButton.small(
          heroTag: 'nota-new-note',
          tooltip: messages.notes.newNote,
          backgroundColor: colors.surface,
          foregroundColor: colors.ink,
          shape: RoundedRectangleBorder(
            borderRadius: const BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: colors.line),
          ),
          onPressed: onNewNote,
          child: const Icon(Icons.edit_outlined),
        ),
        const SizedBox(height: 16),
        SizedBox.square(
          dimension: _recordSize,
          child: FloatingActionButton(
            heroTag: 'nota-record',
            tooltip: messages.audio.record,
            backgroundColor: colors.record,
            foregroundColor: scheme.onError,
            shape: const CircleBorder(),
            onPressed: onRecord,
            child: const Icon(Icons.mic, size: 32),
          ),
        ),
      ],
    );
  }
}
