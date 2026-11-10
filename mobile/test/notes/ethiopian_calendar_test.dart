import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/logic/ethiopian_calendar.dart';

void main() {
  group('toEthiopian', () {
    final cases = <(DateTime, EthiopianDate)>[
      // The millennium, after a leap year (Pagume 6): 12 September.
      (DateTime(2007, 9, 12), const EthiopianDate(year: 2000, month: 1, day: 1)),
      (DateTime(2023, 9, 11), const EthiopianDate(year: 2015, month: 13, day: 6)),
      (DateTime(2023, 9, 12), const EthiopianDate(year: 2016, month: 1, day: 1)),
      // An ordinary new year: 11 September.
      (DateTime(2026, 9, 11), const EthiopianDate(year: 2019, month: 1, day: 1)),
      (DateTime(2026, 9, 10), const EthiopianDate(year: 2018, month: 13, day: 5)),
      (DateTime(2026, 10, 30), const EthiopianDate(year: 2019, month: 2, day: 20)),
      // Genna (Ethiopian Christmas) and Timket.
      (DateTime(2025, 1, 7), const EthiopianDate(year: 2017, month: 4, day: 29)),
      (DateTime(2026, 1, 19), const EthiopianDate(year: 2018, month: 5, day: 11)),
      // Adwa Victory Day, in a Gregorian leap year.
      (DateTime(2024, 3, 2), const EthiopianDate(year: 2016, month: 6, day: 23)),
    ];
    for (final (date, expected) in cases) {
      test('${date.year}-${date.month}-${date.day} → $expected', () {
        expect(toEthiopian(date), expected);
      });
    }

    test('reads the day where the phone is, at any hour', () {
      expect(toEthiopian(DateTime(2026, 10, 30)), toEthiopian(DateTime(2026, 10, 30, 23, 59)));
    });

    test('reads a UTC time as the local day it falls on', () {
      final local = DateTime(2026, 10, 30, 0, 30);

      expect(toEthiopian(local.toUtc()), toEthiopian(local));
    });
  });

  group('formatEthiopianDate', () {
    test('names the month in Amharic', () {
      expect(formatEthiopianDate(const EthiopianDate(year: 2019, month: 2, day: 20), withYear: false), 'ጥቅምት 20');
      expect(formatEthiopianDate(const EthiopianDate(year: 2015, month: 13, day: 6), withYear: true), 'ጳጉሜ 6, 2015');
      expect(
        formatEthiopianDate(const EthiopianDate(year: 2015, month: 13, day: 6), withYear: true, comma: '፣ '),
        'ጳጉሜ 6፣ 2015',
      );
    });
  });
}
