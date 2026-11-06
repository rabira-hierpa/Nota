import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/services.dart' show PlatformException;
import 'package:record/record.dart';

import '../../../core/result.dart';
import 'wav.dart';

/// Why the microphone didn't start. Generic: the interface words each one.
abstract final class RecorderError {
  static const permissionDenied = 'Microphone access was denied.';
  static const startFailed = "The microphone couldn't start.";
  static const silent = 'No sound was recorded.';
  static const interrupted = 'The microphone was interrupted.';
}

/// Peaks below -60 dBFS carry no speech (as on the desktop): digital silence
/// is exactly 0, and a quiet room still reads about -40 dBFS.
const silentPeak = 33;

/// Whether [samples] are silence: a microphone that delivered nothing.
bool isSilent(Iterable<Int16List> samples) => samples.every((chunk) => peakOf(chunk) < silentPeak);

/// The largest absolute sample in [samples].
int peakOf(Int16List samples) {
  var peak = 0;
  for (final sample in samples) {
    final level = sample.abs();
    if (level > peak) peak = level;
  }
  return peak;
}

/// Below this the meter reads empty: quieter than a quiet room.
const _floorDb = -60.0;

/// How often the level meter is updated.
const _levelInterval = Duration(milliseconds: 100);

/// What Nota records: 16 kHz mono 16-bit PCM, the format Hohe takes, with the
/// phone's own processing off so the model hears the voice as it was.
const _speechConfig = RecordConfig(
  encoder: AudioEncoder.wav,
  sampleRate: sampleRate,
  numChannels: 1,
  audioInterruption: AudioInterruptionMode.pause,
);

/// The microphone, through the record package: a voice note recorded straight
/// to a WAV file, or dictation as a stream of samples. One recording at a
/// time; [dispose] when done.
class Recorder {
  Recorder() : _recorder = AudioRecorder();

  final AudioRecorder _recorder;

  /// Whether Nota may use the microphone; asks the first time.
  Future<bool> hasPermission() async {
    try {
      return await _recorder.hasPermission();
    } on PlatformException {
      return false;
    }
  }

  /// Records a WAV file at [path] until [stop] (or [cancel]).
  Future<Result<void>> startFile(String path) async {
    if (!await hasPermission()) return const Err(RecorderError.permissionDenied);
    try {
      await _recorder.start(_speechConfig, path: path);
      return const Ok(null);
    } on PlatformException {
      return const Err(RecorderError.startFailed);
    }
  }

  /// Streams the microphone as 16-bit samples until [stop].
  Future<Result<Stream<Int16List>>> startStream() async {
    if (!await hasPermission()) return const Err(RecorderError.permissionDenied);
    try {
      final bytes = await _recorder.startStream(_speechConfig.copyWith(encoder: AudioEncoder.pcm16bits));
      return Ok(pcm16Samples(bytes));
    } on PlatformException {
      return const Err(RecorderError.startFailed);
    }
  }

  /// The input level, 0 (silence) to 1 (full scale), for a meter.
  Stream<double> levels() =>
      _recorder.onAmplitudeChanged(_levelInterval).map((amplitude) => levelOf(amplitude.current));

  /// Pause, resume and stop, including the system pausing for a phone call.
  Stream<RecordState> states() => _recorder.onStateChanged();

  Future<void> pause() => _quietly(_recorder.pause);

  Future<void> resume() => _quietly(_recorder.resume);

  /// Ends the recording; a WAV file is complete once this returns.
  Future<void> stop() => _quietly(_recorder.stop);

  /// Ends the recording and deletes its file.
  Future<void> cancel() => _quietly(_recorder.cancel);

  Future<void> dispose() => _quietly(_recorder.dispose);

  /// A failure to stop can't be acted on; the file is checked afterwards.
  static Future<void> _quietly(Future<Object?> Function() action) async {
    try {
      await action();
    } on PlatformException {
      // Already stopped, or the recorder is gone.
    }
  }
}

/// A meter reading for a dBFS amplitude: [_floorDb] and below is 0, full scale is 1.
double levelOf(double dbfs) {
  if (dbfs.isNaN) return 0;
  return ((dbfs - _floorDb) / -_floorDb).clamp(0, 1).toDouble();
}

/// Little-endian 16-bit samples from raw PCM chunks. A chunk may end halfway
/// through a sample; its odd byte waits for the next chunk.
Stream<Int16List> pcm16Samples(Stream<Uint8List> bytes) async* {
  int? carry;
  await for (final chunk in bytes) {
    final joined = carry == null
        ? chunk
        : (Uint8List(chunk.length + 1)
            ..[0] = carry
            ..setRange(1, chunk.length + 1, chunk));
    final even = joined.length - joined.length % 2;
    carry = even < joined.length ? joined[even] : null;
    if (even == 0) continue;
    final view = ByteData.sublistView(joined, 0, even);
    final samples = Int16List(even ~/ 2);
    for (var i = 0; i < samples.length; i++) {
      samples[i] = view.getInt16(i * 2, Endian.little);
    }
    yield samples;
  }
}

/// A WAV file's length in milliseconds, from its size and where its audio
/// starts (iOS pads the header, Android doesn't). Null if it can't be read.
Future<int?> wavDurationMs(String path) async {
  final file = File(path);
  try {
    final length = await file.length();
    final head = await _readHead(file, math.min(length, 1 << 16));
    final start = _dataStart(head);
    if (start == null) return null;
    final samples = (length - start) ~/ 2;
    return samples * 1000 ~/ sampleRate;
  } on FileSystemException {
    return null;
  }
}

Future<Uint8List> _readHead(File file, int count) async {
  final handle = await file.open();
  try {
    return await handle.read(count);
  } finally {
    await handle.close();
  }
}

/// Where the "data" chunk's samples begin, walking the RIFF chunks.
int? _dataStart(Uint8List head) {
  if (head.length < 12 || String.fromCharCodes(head, 0, 4) != 'RIFF') return null;
  final view = ByteData.sublistView(head);
  for (var offset = 12; offset + 8 <= head.length;) {
    final id = String.fromCharCodes(head, offset, offset + 4);
    final size = view.getUint32(offset + 4, Endian.little);
    if (id == 'data') return offset + 8;
    offset += 8 + size + size % 2;
  }
  return null;
}
