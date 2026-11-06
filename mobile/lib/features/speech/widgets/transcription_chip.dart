import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../../notes/data/note.dart';

/// A small label for a voice note in the list: "Transcribing… 40%" while
/// Hohe works on it, "Failed" or "Not transcribed" when it needs attention,
/// and nothing once its text is in.
class TranscriptionChip extends StatelessWidget {
  const TranscriptionChip({super.key, required this.note});

  final Note note;

  @override
  Widget build(BuildContext context) {
    final audio = note.audio;
    if (audio == null) return const SizedBox.shrink();
    final speech = AppScope.of(context).speech;
    return ListenableBuilder(
      listenable: speech,
      builder: (context, _) {
        final messages = Messages.of(context);
        final colors = NotaColors.of(context);
        if (speech.isTranscribing(note.id)) {
          final progress = speech.progress(note.id);
          final label = progress == null
              ? messages.audio.badgeTranscribing
              : messages.speech.transcribingPercent((progress * 100).floor());
          return _Pill(label: label, foreground: colors.accentInk, background: colors.accentSoft);
        }
        return switch (audio.transcription) {
          TranscriptionFailed() => _Pill(
            label: messages.audio.badgeFailed,
            foreground: colors.warnInk,
            background: colors.warnSoft,
          ),
          TranscriptionPending() => _Pill(label: messages.audio.badgePending, foreground: colors.muted),
          TranscriptionDone() => const SizedBox.shrink(),
        };
      },
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.foreground, this.background});

  final String label;
  final Color foreground;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(color: foreground);
    final text = Text(label, style: style, maxLines: 1, overflow: TextOverflow.ellipsis);
    if (background == null) return text;
    return DecoratedBox(
      decoration: BoxDecoration(color: background, borderRadius: const BorderRadius.all(Radius.circular(6))),
      child: Padding(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), child: text),
    );
  }
}
