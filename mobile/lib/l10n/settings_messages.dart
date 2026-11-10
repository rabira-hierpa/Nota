/// Settings: language, dates, theme, and the little there is to say about the app.
class SettingsMessages {
  const SettingsMessages({
    required this.title,
    required this.language,
    required this.english,
    required this.amharic,
    required this.dates,
    required this.gregorian,
    required this.ethiopian,
    required this.both,
    required this.today,
    required this.appearance,
    required this.system,
    required this.light,
    required this.dark,
    required this.speech,
    required this.about,
    required this.version,
    required this.privacy,
    required this.licences,
    required this.showIntro,
    required this.introShown,
  });

  static const en = SettingsMessages(
    title: 'Settings',
    language: 'Language',
    english: 'English',
    amharic: 'አማርኛ',
    dates: 'Dates',
    gregorian: 'Gregorian',
    ethiopian: 'Ethiopian',
    both: 'Both',
    today: 'Today:',
    appearance: 'Appearance',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    speech: 'Speech',
    about: 'About Nota',
    version: _versionEn,
    privacy: 'Your notes and recordings stay on this phone. Nota never sends them anywhere.',
    licences: 'Licences',
    showIntro: 'Show the welcome again',
    introShown: 'The welcome is back at the top of your notes.',
  );

  static const am = SettingsMessages(
    title: 'ቅንብሮች',
    language: 'ቋንቋ',
    english: 'English',
    amharic: 'አማርኛ',
    dates: 'ቀኖች',
    gregorian: 'ግሪጎሪያን',
    ethiopian: 'ኢትዮጵያ',
    both: 'ሁለቱም',
    today: 'ዛሬ፦',
    appearance: 'ገጽታ',
    system: 'ሲስተም',
    light: 'ብርሃን',
    dark: 'ጨለማ',
    speech: 'ንግግር',
    about: 'ስለ Nota',
    version: _versionAm,
    privacy: 'ማስታወሻዎችዎ እና ቅጂዎችዎ በዚህ ስልክ ላይ ይቀራሉ። Nota ወደ የትም አይልካቸውም።',
    licences: 'ፈቃዶች',
    showIntro: 'የእንኳን ደህና መጡ መግቢያውን እንደገና አሳይ',
    introShown: 'የእንኳን ደህና መጡ መግቢያው በማስታወሻዎችዎ አናት ላይ ተመልሷል።',
  );

  final String title;
  final String language;

  /// Each language is named in itself, whatever the interface speaks.
  final String english;
  final String amharic;
  final String dates;
  final String gregorian;
  final String ethiopian;
  final String both;

  /// Before a preview of today's date in the chosen calendar.
  final String today;

  /// The theme: follow the phone, or always light or dark.
  final String appearance;
  final String system;
  final String light;
  final String dark;

  /// Heading over the Speech models entry.
  final String speech;
  final String about;
  final String Function(String version) version;
  final String privacy;
  final String licences;

  /// Brings the first-launch intro back to the note list.
  final String showIntro;
  final String introShown;
}

String _versionEn(String version) => 'Version $version';

String _versionAm(String version) => 'ስሪት $version';
