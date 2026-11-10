import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../../settings/settings_store.dart';
import '../../speech/screens/speech_models_screen.dart';
import '../logic/format.dart';
import '../logic/sections.dart';

/// The app's version, as in pubspec.yaml (keep the two in step).
const appVersion = '0.1.0';

/// Settings: the interface language, the calendar dates are shown in, light
/// or dark, the speech models, and about Nota. Each choice applies at once.
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    final settings = scope.settings;
    return ListenableBuilder(
      listenable: settings,
      builder: (context, _) {
        final messages = Messages.of(context);
        final words = messages.settings;
        return Scaffold(
          appBar: AppBar(title: Text(words.title)),
          body: ListView(
            padding: MediaQuery.paddingOf(context).copyWith(top: 0) + const EdgeInsets.only(bottom: 24),
            children: [
              _Heading(words.language),
              for (final (code, name) in [('en', words.english), ('am', words.amharic)])
                _Choice(
                  label: name,
                  selected: settings.locale == code,
                  onTap: () => unawaited(settings.setLocale(code)),
                ),
              _Heading(words.dates),
              for (final (calendar, name) in [
                (CalendarChoice.gregorian, words.gregorian),
                (CalendarChoice.ethiopian, words.ethiopian),
                (CalendarChoice.both, words.both),
              ])
                _Choice(
                  label: name,
                  selected: settings.calendar == calendar,
                  onTap: () => unawaited(settings.setCalendar(calendar)),
                ),
              _TodayPreview(calendar: settings.calendar),
              _Heading(words.appearance),
              for (final (mode, name) in [
                (ThemeMode.system, words.system),
                (ThemeMode.light, words.light),
                (ThemeMode.dark, words.dark),
              ])
                _Choice(
                  label: name,
                  selected: settings.themeMode == mode,
                  onTap: () => unawaited(settings.setThemeMode(mode)),
                ),
              _Heading(words.speech),
              ListTile(
                leading: const Icon(Icons.graphic_eq),
                title: Text(messages.speech.title),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => unawaited(
                  Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SpeechModelsScreen())),
                ),
              ),
              _Heading(words.about),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Text(words.privacy, style: Theme.of(context).textTheme.bodyMedium),
              ),
              ListTile(
                leading: const Icon(Icons.waving_hand_outlined),
                title: Text(words.showIntro),
                onTap: () => _showIntroAgain(context, settings),
              ),
              ListTile(
                leading: const Icon(Icons.description_outlined),
                title: Text(words.licences),
                subtitle: Text(words.version(appVersion)),
                onTap: () => showLicensePage(
                  context: context,
                  applicationName: messages.common.appName,
                  applicationVersion: appVersion,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Brings the welcome back to the top of all notes, where it shows.
  static void _showIntroAgain(BuildContext context, SettingsStore settings) {
    unawaited(settings.setOnboarded(false));
    AppScope.of(context).notes
      ..section = NoteSection.all
      ..query = '';
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(Messages.of(context).settings.introShown)));
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 24, 16, 4),
    child: Semantics(header: true, child: Text(text.toUpperCase(), style: Theme.of(context).textTheme.labelSmall)),
  );
}

/// One option of a group; the chosen one carries a check.
class _Choice extends StatelessWidget {
  const _Choice({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    inMutuallyExclusiveGroup: true,
    checked: selected,
    child: ListTile(
      title: Text(label),
      selected: selected,
      trailing: selected ? Icon(Icons.check, color: NotaColors.of(context).accentInk) : null,
      onTap: onTap,
    ),
  );
}

/// Today's date as the chosen calendar writes it, so the choice is easy to judge.
class _TodayPreview extends StatelessWidget {
  const _TodayPreview({required this.calendar});

  final CalendarChoice calendar;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    final lines = formatFullDate(DateTime.now(), calendar, messages.dates);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
      child: Text('${messages.settings.today} ${lines.join(' · ')}', style: Theme.of(context).textTheme.bodySmall),
    );
  }
}
