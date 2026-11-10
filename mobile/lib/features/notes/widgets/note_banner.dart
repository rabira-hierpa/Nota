import 'package:flutter/material.dart';

import '../../../app/theme.dart';

/// A strip above a note that says where it is (the Trash, the Archive),
/// with what can be done about it.
class NoteBanner extends StatelessWidget {
  const NoteBanner({super.key, required this.icon, required this.message, this.actions = const []});

  final IconData icon;
  final String message;

  /// Buttons, most usual first.
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final colors = NotaColors.of(context);
    final textTheme = Theme.of(context).textTheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.warnSoft,
        border: Border(bottom: BorderSide(color: colors.line)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 12, 8),
        child: Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 4,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 20, color: colors.warnInk),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(message, style: textTheme.bodyMedium?.copyWith(color: colors.warnInk)),
                ),
              ],
            ),
            ...actions,
          ],
        ),
      ),
    );
  }
}
