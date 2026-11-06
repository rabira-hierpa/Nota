import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/hohe/ctc.dart';

import 'fixture.dart';

void main() {
  final fixture = readFixture('ctc.json');
  final vocabulary = CtcVocabulary.fromJson(fixture['tokens']! as Map<String, Object?>);
  int id(String token) => vocabulary.tokens.indexOf(token);

  group('CtcVocabulary', () {
    test("reads hohe.json's tokens, blank and word delimiter", () {
      expect(vocabulary.tokens, hasLength(416));
      expect(vocabulary.tokens[vocabulary.blank], isNotEmpty);
      expect(vocabulary.wordDelimiter, '|');
    });

    test('refuses a file that is something else', () {
      expect(
        () => CtcVocabulary.fromJson({'tokens': <Object?>[], 'blank': 0, 'wordDelimiter': '|'}),
        throwsFormatException,
      );
      expect(
        () => CtcVocabulary.fromJson({
          'tokens': ['a'],
          'blank': 1,
          'wordDelimiter': '|',
        }),
        throwsFormatException,
      );
      expect(
        () => CtcVocabulary.fromJson({
          'tokens': ['a', 2],
          'blank': 0,
          'wordDelimiter': '|',
        }),
        throwsFormatException,
      );
    });
  });

  group('decodeCtc', () {
    test("gives the text Python's processor and helper give", () {
      final cases = fixture['cases']! as List<Object?>;
      // Indices only, so a failure doesn't print the fixture's text.
      final wrong = <int>[];
      for (var i = 0; i < cases.length; i++) {
        final entry = cases[i]! as Map<String, Object?>;
        final ids = (entry['ids']! as List<Object?>).cast<int>();
        if (decodeCtc(ids, vocabulary) != entry['text']) wrong.add(i);
      }
      expect(wrong, isEmpty);
      expect(cases, hasLength(40));
    });

    test('merges repeats, keeps letters a blank separates, and drops the language tag', () {
      final [amh, sa, la, blank, space] = [id('[AMH]'), id('ሰ'), id('ላ'), vocabulary.blank, id('|')];
      expect(decodeCtc([amh, sa, sa, blank, la, la, space, space, la, blank, la], vocabulary), 'ሰላ ላላ');
    });

    test('reads an id outside the vocabulary as nothing', () {
      expect(decodeCtc([id('ሰ'), 9999, id('ላ')], vocabulary), 'ሰላ');
    });
  });

  group('bestTokens', () {
    test('takes the highest score at each step, the first on a tie', () {
      final logits = Float32List.fromList([0.1, 0.9, 0.3, 0.5, 0.5, 0.2]);
      expect(bestTokens(logits, 2, 3), [1, 0]);
    });
  });
}
