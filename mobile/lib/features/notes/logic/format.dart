import 'package:intl/intl.dart';

import '../../../l10n/date_words.dart';
import 'ethiopian_calendar.dart';

/// Which calendar dates are shown in (Settings → Dates).
enum CalendarChoice { gregorian, ethiopian, both }

const _msPerSecond = 1000;
const _secondsPerMinute = 60;
const _secondsPerHour = 3600;

/// ዓ.ም. (ዓመተ ምሕረት): the Ethiopian era, so the year can't be mistaken for a Gregorian one.
const _ethiopianEra = 'ዓ.ም.';

/// 754000 → "12:34"; 3723000 → "1:02:03".
String formatDuration(int ms) {
  final total = ms < 0 ? 0 : ms ~/ _msPerSecond;
  final hours = total ~/ _secondsPerHour;
  final minutes = (total % _secondsPerHour) ~/ _secondsPerMinute;
  final seconds = (total % _secondsPerMinute).toString().padLeft(2, '0');
  return hours > 0 ? '$hours:${minutes.toString().padLeft(2, '0')}:$seconds' : '$minutes:$seconds';
}

/// "Today, 09:41", "Yesterday, 18:03", then the date: "27 Oct, 14:00" (Gregorian),
/// "ጥቅምት 17, 14:00" (Ethiopian) or "27 Oct · ጥቅምት 17, 14:00" (both). The year
/// shows only when it isn't this year. Days are the phone's local days.
String formatDateTime(DateTime date, CalendarChoice calendar, DateWords words, {DateTime? now}) {
  final local = date.toLocal();
  final today = (now ?? DateTime.now()).toLocal();
  final time = _formatTime(local, words);
  if (_isSameDay(local, today)) return '${words.today}${words.comma}$time';
  if (_isSameDay(local, _dayBefore(today))) return '${words.yesterday}${words.comma}$time';
  return '${_formatDay(local, today, calendar, words)}${words.comma}$time';
}

/// The note list's short date: "09:41" today, then "Yesterday", then the date as in [formatDateTime].
String formatListDate(DateTime date, CalendarChoice calendar, DateWords words, {DateTime? now}) {
  final local = date.toLocal();
  final today = (now ?? DateTime.now()).toLocal();
  if (_isSameDay(local, today)) return _formatTime(local, words);
  if (_isSameDay(local, _dayBefore(today))) return words.yesterday;
  return _formatDay(local, today, calendar, words);
}

/// The whole date and time, for the note's info: one line per calendar, e.g.
/// ["Fri, 30 Oct 2026, 09:41"] or ["ጥቅምት 20, 2019 ዓ.ም., 09:41"].
List<String> formatFullDate(DateTime date, CalendarChoice calendar, DateWords words) {
  final local = date.toLocal();
  final time = _formatTime(local, words);
  final gregorian = DateFormat.yMMMEd(words.gregorianLocale).format(local);
  final ethiopian = '${formatEthiopianDate(toEthiopian(local), withYear: true, comma: words.comma)} $_ethiopianEra';
  return switch (calendar) {
    CalendarChoice.gregorian => ['$gregorian${words.comma}$time'],
    CalendarChoice.ethiopian => ['$ethiopian${words.comma}$time'],
    CalendarChoice.both => ['$gregorian${words.comma}$time', ethiopian],
  };
}

/// 24-hour time in either language: "09:41", "18:03".
String _formatTime(DateTime date, DateWords words) => DateFormat('HH:mm', words.gregorianLocale).format(date);

String _formatGregorianDay(DateTime date, DateTime now, DateWords words) {
  final format = date.year == now.year
      ? DateFormat.MMMd(words.gregorianLocale)
      : DateFormat.yMMMd(words.gregorianLocale);
  return format.format(date);
}

String _formatEthiopianDay(DateTime date, DateTime now, DateWords words) {
  final day = toEthiopian(date);
  return formatEthiopianDate(day, withYear: day.year != toEthiopian(now).year, comma: words.comma);
}

String _formatDay(DateTime date, DateTime now, CalendarChoice calendar, DateWords words) => switch (calendar) {
  CalendarChoice.gregorian => _formatGregorianDay(date, now, words),
  CalendarChoice.ethiopian => _formatEthiopianDay(date, now, words),
  CalendarChoice.both => '${_formatGregorianDay(date, now, words)} · ${_formatEthiopianDay(date, now, words)}',
};

/// The local calendar day before [now] (DateTime rolls day 0 back to the month before).
DateTime _dayBefore(DateTime now) => DateTime(now.year, now.month, now.day - 1);

bool _isSameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;
