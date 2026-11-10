/// The Ethiopian calendar: twelve months of 30 days and Pagume, a thirteenth
/// of 5 days (6 in the year before a Gregorian leap year). The year begins on
/// 11 September (12 September before a Gregorian leap year) and runs 7 or 8
/// years behind the Gregorian one. Converted through the Julian day number.
library;

/// A day in the Ethiopian calendar.
class EthiopianDate {
  const EthiopianDate({required this.year, required this.month, required this.day});

  final int year;

  /// 1 (Meskerem) … 13 (Pagume).
  final int month;
  final int day;

  @override
  bool operator ==(Object other) =>
      other is EthiopianDate && other.year == year && other.month == month && other.day == day;

  @override
  int get hashCode => Object.hash(year, month, day);

  @override
  String toString() => 'EthiopianDate($year, $month, $day)';
}

const ethiopianMonths = [
  'መስከረም',
  'ጥቅምት',
  'ኅዳር',
  'ታኅሣሥ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ',
];

/// Julian day number of 1 Meskerem, year 1 (Amete Mihret).
const _epochJdn = 1724221;

/// Julian day number of 1 January 1970.
const _unixEpochJdn = 2440588;
const _msPerDay = 86400000;
const _daysPerYear = 365;
const _daysPerMonth = 30;
const _daysPerFourYears = 1461;

/// Division rounded down, also for negative numbers (Dart's `%` is never negative).
int _floorDiv(int a, int b) => (a - a % b) ~/ b;

int _jdnFromEthiopian(int year, int month, int day) =>
    _epochJdn - 1 + _daysPerYear * (year - 1) + _floorDiv(year, 4) + _daysPerMonth * (month - 1) + day;

/// The calendar day of [date] in the phone's time zone, as a Julian day number.
int _localJdn(DateTime date) {
  final local = date.toLocal();
  return DateTime.utc(local.year, local.month, local.day).millisecondsSinceEpoch ~/ _msPerDay + _unixEpochJdn;
}

/// The Ethiopian date of the day [date] falls on, where the phone is.
EthiopianDate toEthiopian(DateTime date) {
  final jdn = _localJdn(date);
  final year = _floorDiv(4 * (jdn - _epochJdn) + 1463, _daysPerFourYears);
  final month = _floorDiv(jdn - _jdnFromEthiopian(year, 1, 1), _daysPerMonth) + 1;
  final day = jdn + 1 - _jdnFromEthiopian(year, month, 1);
  return EthiopianDate(year: year, month: month, day: day);
}

/// "ጥቅምት 20", with ", 2019" when asked for the year (or "፣ 2019" in an Amharic interface).
String formatEthiopianDate(EthiopianDate date, {required bool withYear, String comma = ', '}) {
  final day = '${ethiopianMonths[date.month - 1]} ${date.day}';
  return withYear ? '$day$comma${date.year}' : day;
}
