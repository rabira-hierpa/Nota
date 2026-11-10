import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:nota/features/notes/logic/format.dart';
import 'package:nota/l10n/date_words.dart';

const _en = DateWords(today: 'Today', yesterday: 'Yesterday', gregorianLocale: 'en_GB', comma: ', ');
const _am = DateWords(today: 'ዛሬ', yesterday: 'ትናንት', gregorianLocale: 'am', comma: '፣ ');

final _now = DateTime(2026, 10, 28, 12, 0);

/// A local time, stored as notes store it (UTC). Months count from 1.
DateTime _at(int year, int month, int day, int hour, int minute) => DateTime(year, month, day, hour, minute).toUtc();

void main() {
  setUpAll(initializeDateFormatting);

  group('formatDuration', () {
    final cases = {0: '0:00', 999: '0:00', 61000: '1:01', 754000: '12:34', 3723000: '1:02:03', -5: '0:00'};
    cases.forEach((ms, expected) {
      test('$ms ms → $expected', () {
        expect(formatDuration(ms), expected);
      });
    });
  });

  group('formatDateTime', () {
    test('says Today and Yesterday for recent notes, in any calendar', () {
      expect(formatDateTime(_at(2026, 10, 28, 9, 41), CalendarChoice.gregorian, _en, now: _now), 'Today, 09:41');
      expect(formatDateTime(_at(2026, 10, 27, 18, 3), CalendarChoice.ethiopian, _en, now: _now), 'Yesterday, 18:03');
    });

    test('shows the date, and the year only when it differs', () {
      expect(formatDateTime(_at(2026, 10, 20, 14, 0), CalendarChoice.gregorian, _en, now: _now), '20 Oct, 14:00');
      expect(formatDateTime(_at(2025, 3, 3, 8, 15), CalendarChoice.gregorian, _en, now: _now), '3 Mar 2025, 08:15');
    });

    test('shows the Ethiopian date, or both side by side', () {
      expect(formatDateTime(_at(2026, 10, 20, 14, 0), CalendarChoice.ethiopian, _en, now: _now), 'ጥቅምት 10, 14:00');
      expect(formatDateTime(_at(2026, 10, 20, 14, 0), CalendarChoice.both, _en, now: _now), '20 Oct · ጥቅምት 10, 14:00');
    });

    test('counts years by the Ethiopian new year (11 September), not 1 January', () {
      // 2019 began on 11 September 2026: a note from August is from last year.
      expect(formatDateTime(_at(2026, 8, 20, 9, 0), CalendarChoice.ethiopian, _en, now: _now), 'ነሐሴ 14, 2018, 09:00');
      expect(formatDateTime(_at(2026, 9, 20, 9, 0), CalendarChoice.ethiopian, _en, now: _now), 'መስከረም 10, 09:00');
    });

    test('says Yesterday across the start of a month', () {
      final firstOfMonth = DateTime(2026, 11, 1, 8, 0);

      expect(
        formatDateTime(_at(2026, 10, 31, 22, 15), CalendarChoice.gregorian, _en, now: firstOfMonth),
        'Yesterday, 22:15',
      );
    });
  });

  group('formatListDate', () {
    test('shows the time today, then Yesterday, then the date', () {
      expect(formatListDate(_at(2026, 10, 28, 9, 41), CalendarChoice.gregorian, _en, now: _now), '09:41');
      expect(formatListDate(_at(2026, 10, 27, 18, 3), CalendarChoice.gregorian, _en, now: _now), 'Yesterday');
      expect(formatListDate(_at(2026, 10, 20, 14, 0), CalendarChoice.gregorian, _en, now: _now), '20 Oct');
      expect(formatListDate(_at(2025, 3, 3, 8, 15), CalendarChoice.gregorian, _en, now: _now), '3 Mar 2025');
    });

    test('uses the chosen calendar', () {
      expect(formatListDate(_at(2026, 10, 20, 14, 0), CalendarChoice.ethiopian, _en, now: _now), 'ጥቅምት 10');
      expect(formatListDate(_at(2025, 3, 3, 8, 15), CalendarChoice.both, _en, now: _now), '3 Mar 2025 · የካቲት 24, 2017');
    });
  });

  group('formatFullDate', () {
    final date = _at(2026, 10, 30, 9, 41);

    test('gives one line per calendar', () {
      expect(formatFullDate(date, CalendarChoice.gregorian, _en), ['Fri, 30 Oct 2026, 09:41']);
      expect(formatFullDate(date, CalendarChoice.ethiopian, _en), ['ጥቅምት 20, 2019 ዓ.ም., 09:41']);
      expect(formatFullDate(date, CalendarChoice.both, _en), ['Fri, 30 Oct 2026, 09:41', 'ጥቅምት 20, 2019 ዓ.ም.']);
    });
  });

  group('in Amharic', () {
    test('says ዛሬ and ትናንት, and names Gregorian months in Amharic', () {
      expect(formatDateTime(_at(2026, 10, 28, 9, 41), CalendarChoice.gregorian, _am, now: _now), 'ዛሬ፣ 09:41');
      expect(formatListDate(_at(2026, 10, 27, 18, 3), CalendarChoice.gregorian, _am, now: _now), 'ትናንት');
      expect(formatListDate(_at(2026, 10, 20, 14, 0), CalendarChoice.gregorian, _am, now: _now), 'ኦክቶ 20');
      expect(formatListDate(_at(2026, 10, 20, 14, 0), CalendarChoice.ethiopian, _am, now: _now), 'ጥቅምት 10');
    });

    test('keeps a 24-hour clock', () {
      expect(formatDateTime(_at(2026, 10, 28, 18, 3), CalendarChoice.ethiopian, _am, now: _now), 'ዛሬ፣ 18:03');
    });

    test('writes the full date with Amharic day and month names', () {
      expect(formatFullDate(_at(2026, 10, 30, 9, 41), CalendarChoice.gregorian, _am), ['ዓርብ፣ ኦክቶ 30 2026፣ 09:41']);
      expect(formatFullDate(_at(2026, 10, 30, 9, 41), CalendarChoice.ethiopian, _am), ['ጥቅምት 20፣ 2019 ዓ.ም.፣ 09:41']);
    });
  });
}
