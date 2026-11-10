/// The words dates are written with, in the interface language.
class DateWords {
  const DateWords({required this.today, required this.yesterday, required this.gregorianLocale, required this.comma});

  final String today;
  final String yesterday;

  /// The `intl` locale Gregorian dates are written in, e.g. `en_GB` or `am`.
  final String gregorianLocale;

  /// Between a date and its time or year.
  final String comma;
}
