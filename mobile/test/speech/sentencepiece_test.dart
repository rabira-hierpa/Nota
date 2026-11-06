import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/hohe/sentencepiece.dart';

import 'fixture.dart';

void main() {
  final fixture = readFixture('punct.json');
  final table = PieceTable.fromJson(fixture['table']! as Map<String, Object?>);

  group('UnigramTokenizer', () {
    final tokenizer = UnigramTokenizer(table);

    test('cuts words as SentencePiece does with the kept pieces only', () {
      final words = fixture['words']! as List<Object?>;
      // Indices only, so a failure doesn't print the fixture's words.
      final wrong = <int>[];
      for (var i = 0; i < words.length; i++) {
        final [word as String, ids as List<Object?>] = words[i]! as List<Object?>;
        if (!_sameIds(tokenizer.encodeWord(word), ids.cast<int>())) wrong.add(i);
      }
      expect(wrong, isEmpty);
      expect(words.length, greaterThan(500));
    });

    test('gives a run of characters no piece covers one unknown id', () {
      final ids = tokenizer.encodeWord('中文');
      expect(ids.where((piece) => piece == table.unk), hasLength(1));
    });

    test('never matches a control piece', () {
      final controls = {for (var id = 0; id < table.specials; id++) table.pieces[id].$1};
      for (final control in controls) {
        expect(tokenizer.encodeWord(control).where((id) => id < table.specials && id != table.unk), isEmpty);
      }
    });
  });

  group('PieceTable', () {
    test("reads punct.json's pieces", () {
      expect(table.pieces, hasLength(6052));
      expect(table.specials, 4);
      expect(table.unk, 3);
    });

    test('refuses a table that is something else', () {
      expect(() => PieceTable.fromJson({'pieces': 'x', 'specials': 4, 'unk': 3}), throwsFormatException);
      expect(
        () => PieceTable.fromJson({
          'pieces': [
            ['a', 'b'],
          ],
          'specials': 0,
          'unk': 0,
        }),
        throwsFormatException,
      );
    });
  });
}

bool _sameIds(List<int> actual, List<int> expected) {
  if (actual.length != expected.length) return false;
  for (var i = 0; i < actual.length; i++) {
    if (actual[i] != expected[i]) return false;
  }
  return true;
}
