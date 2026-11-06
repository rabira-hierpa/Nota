import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'audio_messages.dart';
import 'common_messages.dart';
import 'date_words.dart';
import 'editor_messages.dart';
import 'notes_messages.dart';
import 'settings_messages.dart';
import 'speech_messages.dart';

export 'audio_messages.dart';
export 'common_messages.dart';
export 'date_words.dart';
export 'editor_messages.dart';
export 'notes_messages.dart';
export 'settings_messages.dart';
export 'speech_messages.dart';

/// Every word the interface shows, in English and in Amharic. Both instances
/// are built from the same classes, so the type system checks that neither
/// language is missing a message. Buttons and menu items are short commands
/// (ቅዳ, ደርድር), as in Amharic software; sentences that speak to the person
/// are polite (ይጻፉ, ይሞክሩ), as on the desktop.
class Messages {
  const Messages({
    required this.languageCode,
    required this.common,
    required this.sections,
    required this.notes,
    required this.editor,
    required this.audio,
    required this.speech,
    required this.settings,
    required this.dates,
  });

  static final en = Messages(
    languageCode: 'en',
    common: CommonMessages.en,
    sections: SectionsMessages.en,
    notes: NotesMessages.en,
    editor: EditorMessages.en,
    audio: AudioMessages.en,
    speech: SpeechMessages.en,
    settings: SettingsMessages.en,
    dates: const DateWords(today: 'Today', yesterday: 'Yesterday', gregorianLocale: 'en_GB', comma: ', '),
  );

  static final am = Messages(
    languageCode: 'am',
    common: CommonMessages.am,
    sections: SectionsMessages.am,
    notes: NotesMessages.am,
    editor: EditorMessages.am,
    audio: AudioMessages.am,
    speech: SpeechMessages.am,
    settings: SettingsMessages.am,
    dates: const DateWords(today: 'ዛሬ', yesterday: 'ትናንት', gregorianLocale: 'am', comma: '፣ '),
  );

  /// The languages the interface speaks, for `MaterialApp.supportedLocales`.
  static const supportedLocales = [Locale('en'), Locale('am')];

  /// Material's, Cupertino's and the widgets' own words, in both languages.
  static const localizationsDelegates = GlobalMaterialLocalizations.delegates;

  /// The messages for the app's current locale.
  static Messages of(BuildContext context) => forLanguage(Localizations.localeOf(context).languageCode);

  /// Amharic for 'am'; English for anything else.
  static Messages forLanguage(String languageCode) => languageCode == 'am' ? am : en;

  final String languageCode;
  final CommonMessages common;
  final SectionsMessages sections;
  final NotesMessages notes;
  final EditorMessages editor;
  final AudioMessages audio;
  final SpeechMessages speech;
  final SettingsMessages settings;
  final DateWords dates;

  /// A failure kept with a note in English (a speech message, or the generic
  /// one), in this language. Text it doesn't know is shown as it is.
  String translate(String message) {
    final index = _storable(en).indexOf(message);
    return index < 0 ? message : _storable(this)[index];
  }

  static List<String> _storable(Messages messages) => [...messages.speech.storable, messages.common.generic];
}
