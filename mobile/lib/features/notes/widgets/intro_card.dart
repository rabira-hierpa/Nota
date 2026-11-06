import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/messages.dart';

/// The first-launch welcome at the top of the note list: what Nota does, and
/// that speaking notes needs the speech model added once (until it is).
/// Stays until dismissed.
class IntroCard extends StatelessWidget {
  const IntroCard({
    super.key,
    required this.speechReady,
    required this.onWrite,
    required this.onSetUpSpeech,
    required this.onDismiss,
  });

  /// The speech model is in place, so there is nothing to set up.
  final bool speechReady;
  final VoidCallback onWrite;
  final VoidCallback onSetUpSpeech;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context).notes;
    final colors = NotaColors.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(header: true, child: Text(messages.introTitle, style: textTheme.titleLarge)),
              const SizedBox(height: 12),
              for (final point in messages.introPoints)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsetsDirectional.only(top: 9, end: 12),
                        child: ExcludeSemantics(
                          child: SizedBox.square(
                            dimension: 6,
                            child: DecoratedBox(
                              decoration: BoxDecoration(color: colors.accent, shape: BoxShape.circle),
                            ),
                          ),
                        ),
                      ),
                      Expanded(child: Text(point, style: textTheme.bodyMedium)),
                    ],
                  ),
                ),
              if (!speechReady) ...[
                const SizedBox(height: 4),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: colors.accentSoft,
                    borderRadius: const BorderRadius.all(Radius.circular(8)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.mic_none, color: colors.accentInk),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            messages.introSpeech,
                            style: textTheme.bodyMedium?.copyWith(color: colors.accentInk),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  if (!speechReady) FilledButton(onPressed: onSetUpSpeech, child: Text(messages.introSetUpSpeech)),
                  if (speechReady)
                    FilledButton(onPressed: onWrite, child: Text(messages.introWrite))
                  else
                    OutlinedButton(onPressed: onWrite, child: Text(messages.introWrite)),
                  TextButton(onPressed: onDismiss, child: Text(messages.introDismiss)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
