import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/speech/audio/wav.dart';

/// A WAV file of `samples` in the given format, optionally with a chunk
/// between "fmt " and "data", as some tools write.
Uint8List wav(List<int> samples, {int rate = sampleRate, int channels = 1, int bits = 16, bool extraChunk = false}) {
  final extra = extraChunk ? 8 + 3 + 1 : 0;
  final bytes = Uint8List(44 + extra + samples.length * 2);
  final view = ByteData.sublistView(bytes);
  void text(int at, String value) => bytes.setAll(at, ascii.encode(value));
  text(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, Endian.little);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, Endian.little);
  view.setUint16(20, 1, Endian.little);
  view.setUint16(22, channels, Endian.little);
  view.setUint32(24, rate, Endian.little);
  view.setUint32(28, rate * channels * bits ~/ 8, Endian.little);
  view.setUint16(32, channels * bits ~/ 8, Endian.little);
  view.setUint16(34, bits, Endian.little);
  var at = 36;
  if (extraChunk) {
    text(at, 'LIST');
    view.setUint32(at + 4, 3, Endian.little); // odd: padded to 4
    at += extra;
  }
  text(at, 'data');
  view.setUint32(at + 4, samples.length * 2, Endian.little);
  for (var i = 0; i < samples.length; i++) {
    view.setInt16(at + 8 + i * 2, samples[i], Endian.little);
  }
  return bytes;
}

List<int>? samplesOf(Result<Int16List> result) => result.valueOrNull?.toList();

String ascii4(Uint8List bytes, int start, int length) => String.fromCharCodes(bytes, start, start + length);

void main() {
  group('readWav', () {
    test("reads Nota's 16 kHz mono 16-bit recordings", () {
      expect(samplesOf(readWav(wav([0, 1, -1, 32767, -32768]))), [0, 1, -1, 32767, -32768]);
    });

    test("skips chunks it doesn't need, padding included", () {
      expect(samplesOf(readWav(wav([5, 6], extraChunk: true))), [5, 6]);
    });

    test("reads from a view that doesn't start its buffer", () {
      final inner = wav([7, 8]);
      final outer = Uint8List(inner.length + 1)..setAll(1, inner);
      expect(samplesOf(readWav(Uint8List.sublistView(outer, 1))), [7, 8]);
    });

    test('keeps what is there of a cut-off file', () {
      final bytes = wav([1, 2, 3]);
      expect(samplesOf(readWav(Uint8List.sublistView(bytes, 0, bytes.length - 3))), [1]);
    });

    test('refuses other formats and other files', () {
      expect(readWav(wav([1], rate: 44100)), isA<Err<Int16List>>());
      expect(readWav(wav([1], channels: 2)), isA<Err<Int16List>>());
      expect(readWav(wav([1], bits: 8)), isA<Err<Int16List>>());
      expect(readWav(Uint8List.fromList(utf8.encode('ID3 not a wav'))), isA<Err<Int16List>>());
      expect(readWav(Uint8List(0)), isA<Err<Int16List>>());
    });

    test('says there is no audio when the data chunk is missing', () {
      final bytes = wav([1, 2]);
      expect(readWav(Uint8List.sublistView(bytes, 0, 36)), isA<Err<Int16List>>());
    });
  });

  group('encodeWav', () {
    test('writes a 16-bit mono PCM header for the sample rate', () {
      final bytes = encodeWav(Int16List(4));
      final view = ByteData.sublistView(bytes);

      expect(bytes.length, 44 + 8);
      expect(ascii4(bytes, 0, 4), 'RIFF');
      expect(view.getUint32(4, Endian.little), bytes.length - 8);
      expect(ascii4(bytes, 8, 8), 'WAVEfmt ');
      expect(view.getUint16(20, Endian.little), 1);
      expect(view.getUint16(22, Endian.little), 1);
      expect(view.getUint32(24, Endian.little), 16000);
      expect(view.getUint32(28, Endian.little), 32000);
      expect(view.getUint16(34, Endian.little), 16);
      expect(ascii4(bytes, 36, 4), 'data');
      expect(view.getUint32(40, Endian.little), 8);
    });

    test('writes the samples little-endian, from a view as from a list', () {
      final source = Int16List.fromList([99, 0, 1, -1, 32767, -32768, 16384, 99]);
      final bytes = encodeWav(Int16List.sublistView(source, 1, 7), sampleRate: 8000);
      final view = ByteData.sublistView(bytes);
      expect([for (var i = 0; i < 6; i++) view.getInt16(44 + i * 2, Endian.little)], [0, 1, -1, 32767, -32768, 16384]);
      expect(view.getUint32(24, Endian.little), 8000);
    });

    test('reads back as it was written', () {
      final samples = Int16List.fromList([for (var i = 0; i < 1000; i++) (i * 37 % 65536) - 32768]);
      expect(samplesOf(readWav(encodeWav(samples))), samples.toList());
    });
  });
}
