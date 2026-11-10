import 'package:flutter/widgets.dart';

import '../features/notes/state/notes_store.dart';
import '../features/settings/settings_store.dart';
import '../features/speech/models/model_store.dart';
import '../features/speech/state/speech_service.dart';

/// The app's stores, for any widget below the app. Widgets that draw from a
/// store listen to it themselves (`ListenableBuilder`); this only hands them out.
class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.settings,
    required this.notes,
    required this.models,
    required this.speech,
    required super.child,
  });

  final SettingsStore settings;
  final NotesStore notes;
  final ModelStore models;
  final SpeechService speech;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'No AppScope above this widget');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) =>
      settings != oldWidget.settings ||
      notes != oldWidget.notes ||
      models != oldWidget.models ||
      speech != oldWidget.speech;
}
