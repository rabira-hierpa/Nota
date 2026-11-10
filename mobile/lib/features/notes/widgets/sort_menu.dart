import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../l10n/messages.dart';
import '../logic/sections.dart';

/// Chooses the note list's order; the choice is kept in Settings.
class SortMenu extends StatelessWidget {
  const SortMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = AppScope.of(context).settings;
    final messages = Messages.of(context).notes;
    return PopupMenuButton<SortOrder>(
      icon: const Icon(Icons.sort),
      tooltip: messages.sortLabel,
      initialValue: settings.sortOrder,
      onSelected: (order) => unawaited(settings.setSortOrder(order)),
      itemBuilder: (context) => [
        for (final order in SortOrder.values)
          CheckedPopupMenuItem<SortOrder>(
            value: order,
            checked: order == settings.sortOrder,
            child: Text(switch (order) {
              SortOrder.edited => messages.sortEdited,
              SortOrder.created => messages.sortCreated,
              SortOrder.title => messages.sortTitle,
            }),
          ),
      ],
    );
  }
}
