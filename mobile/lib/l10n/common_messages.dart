/// English's one/many choice; Amharic messages pick their own forms.
String pluralEn(int count, String one, String many) => count == 1 ? one : many;

/// Words used all over the app: buttons, generic failures.
class CommonMessages {
  const CommonMessages({
    required this.appName,
    required this.cancel,
    required this.close,
    required this.delete,
    required this.tryAgain,
    required this.undo,
    required this.copied,
    required this.untitled,
    required this.errorTitle,
    required this.errorBody,
    required this.generic,
  });

  static const en = CommonMessages(
    appName: 'Nota',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    tryAgain: 'Try again',
    undo: 'Undo',
    copied: 'Copied',
    untitled: 'Untitled',
    errorTitle: 'Something went wrong',
    errorBody: 'Your notes are safe on this phone. Try loading the screen again.',
    generic: 'Something went wrong. Try again.',
  );

  static const am = CommonMessages(
    appName: 'Nota',
    cancel: 'ይቅር',
    close: 'ዝጋ',
    delete: 'ሰርዝ',
    tryAgain: 'እንደገና ሞክር',
    undo: 'ቀልብስ',
    copied: 'ተቀድቷል',
    untitled: 'ርዕስ የሌለው',
    errorTitle: 'የሆነ ችግር ተፈጥሯል',
    errorBody: 'ማስታወሻዎችዎ በዚህ ስልክ ላይ በደህና ተቀምጠዋል። ገጹን እንደገና ለመጫን ይሞክሩ።',
    generic: 'የሆነ ችግር ተፈጥሯል። እንደገና ይሞክሩ።',
  );

  final String appName;
  final String cancel;
  final String close;
  final String delete;
  final String tryAgain;
  final String undo;
  final String copied;

  /// A note with no first line yet.
  final String untitled;

  /// The screen shown when a build fails.
  final String errorTitle;
  final String errorBody;

  /// A failure with nothing more specific to say.
  final String generic;
}
