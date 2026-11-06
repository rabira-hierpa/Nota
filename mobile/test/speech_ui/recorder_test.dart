import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/audio/recorder.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:path/path.dart' as p;

/// Little-endian bytes of [samples].
Uint8List bytesOf(List<int> samples) {
  final data = ByteData(samples.length * 2);
  for (var i = 0; i < samples.length; i++) {
    data.setInt16(i * 2, samples[i], Endian.little);
  }
  return data.buffer.asUint8List();
}

void main() {
  group('pcm16Samples', () {
    test('reads little-endian samples', () async {
      final samples = await pcm16Samples(Stream.value(bytesOf([1, -1, 32767, -32768]))).toList();
      expect(samples.expand((chunk) => chunk), [1, -1, 32767, -32768]);
    });

    test('carries a sample split across chunks', () async {
      final bytes = bytesOf([1000, -2000, 3000]);
      final chunks = Stream.fromIterable([bytes.sublist(0, 1), bytes.sublist(1, 4), bytes.sublist(4)]);
      final samples = await pcm16Samples(chunks).toList();
      expect(samples.expand((chunk) => chunk), [1000, -2000, 3000]);
    });
  });

  test('levelOf maps -60…0 dBFS onto 0…1', () {
    expect(levelOf(-160), 0);
    expect(levelOf(-60), 0);
    expect(levelOf(-30), closeTo(0.5, 1e-9));
    expect(levelOf(0), 1);
    expect(levelOf(3), 1);
    expect(levelOf(double.nan), 0);
  });

  test('isSilent tells digital silence from a quiet room', () {
    expect(
      isSilent([
        Int16List(100),
        Int16List.fromList([3, -20, 32]),
      ]),
      isTrue,
    );
    expect(
      isSilent([
        Int16List(100),
        Int16List.fromList([0, 400, 0]),
      ]),
      isFalse,
    );
    expect(isSilent(const []), isTrue);
  });

  group('wavDurationMs', () {
    late Directory dir;

    setUp(() async => dir = await Directory.systemTemp.createTemp('nota_wav_'));
    tearDown(() => dir.delete(recursive: true));

    test('reads a canonical WAV (Android)', () async {
      final path = p.join(dir.path, 'a.wav');
      await File(path).writeAsBytes(encodeWav(Int16List(sampleRate * 3 ~/ 2)));
      expect(await wavDurationMs(path), 1500);
    });

    test('skips a padded header (iOS)', () async {
      final wav = encodeWav(Int16List(sampleRate));
      // An 'FLLR' chunk of 4044 bytes between "fmt " and "data", as Apple writes.
      final padding = ByteData(8 + 4044)
        ..setUint8(0, 0x46)
        ..setUint8(1, 0x4c)
        ..setUint8(2, 0x4c)
        ..setUint8(3, 0x52)
        ..setUint32(4, 4044, Endian.little);
      final padded = [...wav.sublist(0, 36), ...padding.buffer.asUint8List(), ...wav.sublist(36)];
      final path = p.join(dir.path, 'b.wav');
      await File(path).writeAsBytes(padded);
      expect(await wavDurationMs(path), 1000);
    });

    test('is null for a missing or foreign file', () async {
      expect(await wavDurationMs(p.join(dir.path, 'none.wav')), isNull);
      final path = p.join(dir.path, 'c.txt');
      await File(path).writeAsString('not a recording');
      expect(await wavDurationMs(path), isNull);
    });
  });
}
