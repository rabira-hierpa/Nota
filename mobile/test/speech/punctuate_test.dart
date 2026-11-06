import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/hohe/punctuate.dart';
import 'package:nota/features/speech/hohe/sentencepiece.dart';

const labels = ['<NULL>', '<ACRONYM>', '.', ',', '?', '？', '，', '。', '、', '・', '।', '؟', '،', ';', '።', '፣', '፧'];

int label(String mark) => labels.indexOf(mark);

/// A tokenizer where each letter a–z is one piece (ids 4–29).
PunctuationConfig letters(int maxLength) => PunctuationConfig(
  maxLength: maxLength,
  postLabels: labels,
  bos: 0,
  eos: 2,
  table: PieceTable(
    pieces: [
      ('<s>', 0),
      ('<pad>', 0),
      ('</s>', 0),
      ('<unk>', 0),
      for (var c = 0; c < 26; c++) ('▁${String.fromCharCode(97 + c)}', -1),
    ],
    specials: 4,
    unk: 3,
  ),
);

Future<String> run(String text, PunctuationConfig config, RunWindow window) =>
    punctuate(text, UnigramTokenizer(config.table), config, window);

void main() {
  group('punctuate', () {
    test("adds a full stop or question mark only where both of the model's heads end a sentence", () async {
      final config = letters(16);
      final marks = [0, label('።'), label('?'), label('፣'), label('.'), label('።')];
      Future<WindowLabels> window(List<int> ids) async => WindowLabels(
        post: [for (var i = 0; i < ids.length; i++) i < marks.length ? marks[i] : 0],
        seg: [for (var i = 0; i < ids.length; i++) i >= 1 && i <= 4 ? 1 : 0],
      );
      // Word 5 has a full stop label but no sentence boundary; word 3's comma is left out.
      expect(await run('a b c d e', config, window), 'a። b? c d። e');
    });

    test('takes each word\'s label from the window where it sits furthest from a cut', () async {
      // Room for 6 pieces, windows every 3: they start at 0, 3 and 6 of 12 words.
      final config = letters(8);
      final marks = ['።', '?', '<NULL>'];
      final windows = <List<int>>[];
      Future<WindowLabels> window(List<int> ids) async {
        final mark = label(marks[windows.length]);
        windows.add(ids);
        return WindowLabels(post: List.filled(ids.length, mark), seg: List.filled(ids.length, 1));
      }

      const text = 'a b c d e f g h i j k l';
      expect(await run(text, config, window), 'a። b። c። d። e። f? g? h? i j k l');
      expect(windows, hasLength(3));
      expect(windows.every((ids) => ids.first == 0 && ids.last == 2 && ids.length <= 8), isTrue);
    });

    test('leaves a word that already ends a sentence, and empty text, alone', () async {
      final config = letters(16);
      Future<WindowLabels> window(List<int> ids) async =>
          WindowLabels(post: List.filled(ids.length, label('።')), seg: List.filled(ids.length, 1));
      expect(await run('a? b', config, window), 'a? b።');
      expect(await run('  ', config, window), '  ');
    });

    test('reads a label the config lacks as no mark', () async {
      final config = letters(16);
      Future<WindowLabels> window(List<int> ids) async =>
          WindowLabels(post: List.filled(ids.length, 99), seg: List.filled(ids.length, 1));
      expect(await run('a b', config, window), 'a b');
    });
  });

  group('sentenceEnd', () {
    test('writes ። for any full stop and ? for any question mark, only at a sentence end', () {
      expect(sentenceEnd('.', true), '።');
      expect(sentenceEnd('。', true), '።');
      expect(sentenceEnd('።', true), '።');
      expect(sentenceEnd('?', true), '?');
      expect(sentenceEnd('፧', true), '?');
      expect(sentenceEnd('؟', true), '?');
      expect(sentenceEnd('።', false), '');
      expect(sentenceEnd('፣', true), '');
      expect(sentenceEnd('<NULL>', true), '');
    });
  });

  group('PunctuationConfig', () {
    test('reads punct.json', () {
      final config = PunctuationConfig.fromJson({
        'maxLength': 256,
        'postLabels': labels,
        'bos': 0,
        'eos': 2,
        'unk': 3,
        'specials': 4,
        'pieces': [
          ['<s>', 0],
          ['<pad>', 0],
          ['</s>', 0],
          ['<unk>', 0],
          ['▁ሰ', -8.5],
        ],
      });
      expect(config.maxLength, 256);
      expect(config.postLabels, labels);
      expect(config.table.pieces.last, ('▁ሰ', -8.5));
      expect(config.table.unk, 3);
    });

    test('refuses a file that is something else', () {
      expect(
        () => PunctuationConfig.fromJson({'maxLength': 2, 'postLabels': labels, 'bos': 0, 'eos': 2}),
        throwsFormatException,
      );
      expect(
        () => PunctuationConfig.fromJson({
          'maxLength': 256,
          'postLabels': <Object?>[],
          'bos': 0,
          'eos': 2,
          'unk': 3,
          'specials': 4,
          'pieces': <Object?>[],
        }),
        throwsFormatException,
      );
    });
  });
}
