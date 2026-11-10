import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../features/notes/screens/home_screen.dart';
import '../features/notes/state/notes_store.dart';
import '../features/settings/settings_store.dart';
import '../features/speech/models/model_store.dart';
import '../features/speech/state/speech_service.dart';
import '../l10n/messages.dart';
import 'app_scope.dart';
import 'theme.dart';

/// The app: its stores above everything, the theme and language from
/// Settings, and the note list as home. Writes that fail anywhere are
/// reported here, once, whichever screen is showing.
class NotaApp extends StatefulWidget {
  const NotaApp({super.key, required this.settings, required this.notes, required this.models, required this.speech});

  final SettingsStore settings;
  final NotesStore notes;
  final ModelStore models;
  final SpeechService speech;

  @override
  State<NotaApp> createState() => _NotaAppState();
}

class _NotaAppState extends State<NotaApp> {
  /// The same failure again within this time is the same trouble (a save
  /// failing on every pause in typing), so it is not reported twice.
  static const _repeatQuiet = Duration(seconds: 6);

  final _messenger = GlobalKey<ScaffoldMessengerState>();
  StreamSubscription<NotesFailure>? _failures;
  NotesFailure? _lastFailure;
  DateTime _lastReported = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _failures = widget.notes.failures.listen(_report);
  }

  @override
  void didUpdateWidget(NotaApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.notes != widget.notes) {
      unawaited(_failures?.cancel());
      _failures = widget.notes.failures.listen(_report);
    }
  }

  @override
  void dispose() {
    unawaited(_failures?.cancel());
    super.dispose();
  }

  void _report(NotesFailure failure) {
    final now = DateTime.now();
    if (failure == _lastFailure && now.difference(_lastReported) < _repeatQuiet) return;
    _lastFailure = failure;
    _lastReported = now;
    final messages = Messages.forLanguage(widget.settings.locale);
    final text = switch (failure) {
      NotesFailure.load => messages.notes.loadFailed,
      NotesFailure.save => messages.editor.saveFailed,
      NotesFailure.tooLong => messages.editor.tooLong,
      NotesFailure.delete => messages.notes.deleteFailed,
    };
    _messenger.currentState
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) => AppScope(
    settings: widget.settings,
    notes: widget.notes,
    models: widget.models,
    speech: widget.speech,
    child: ListenableBuilder(
      listenable: widget.settings,
      builder: (context, _) => MaterialApp(
        title: 'Nota',
        debugShowCheckedModeBanner: false,
        theme: NotaTheme.light,
        darkTheme: NotaTheme.dark,
        themeMode: widget.settings.themeMode,
        locale: Locale(widget.settings.locale),
        supportedLocales: Messages.supportedLocales,
        localizationsDelegates: Messages.localizationsDelegates,
        scaffoldMessengerKey: _messenger,
        home: const HomeScreen(),
      ),
    ),
  );
}

/// In release builds, a part of the screen that fails to build says so
/// calmly, in the interface language, instead of Flutter's grey box. Debug
/// builds keep Flutter's own error, which says what went wrong.
void installErrorScreen(SettingsStore settings) {
  if (!kReleaseMode) return;
  ErrorWidget.builder = (_) => _BuildFailed(messages: Messages.forLanguage(settings.locale).common);
}

class _BuildFailed extends StatelessWidget {
  const _BuildFailed({required this.messages});

  final CommonMessages messages;

  @override
  Widget build(BuildContext context) {
    final colors = NotaColors.of(context);
    final textTheme = Theme.of(context).textTheme;
    return ColoredBox(
      color: colors.paper,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                messages.errorTitle,
                textAlign: TextAlign.center,
                textDirection: TextDirection.ltr,
                style: textTheme.titleMedium?.copyWith(color: colors.ink),
              ),
              const SizedBox(height: 8),
              Text(
                messages.errorBody,
                textAlign: TextAlign.center,
                textDirection: TextDirection.ltr,
                style: textTheme.bodyMedium?.copyWith(color: colors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
