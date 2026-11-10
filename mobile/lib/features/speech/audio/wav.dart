import 'dart:math' as math;
import 'dart:typed_data';

import '../../../core/result.dart';

/// Nota keeps all audio at 16 kHz, the rate Hohe was trained on.
const sampleRate = 16000;

const _pcm = 1;
const _riffHeaderBytes = 12;
const _chunkHeaderBytes = 8;
const _fmtBytes = 16;
const _bytesPerSample = 2;
const _bitsPerSample = _bytesPerSample * 8;
const _canonicalHeaderBytes = 44;

/// Phones are little-endian, as WAV is: their samples copy as bytes.
final _littleEndianHost = Endian.host == Endian.little;

String _ascii(Uint8List bytes, int start) => String.fromCharCodes(bytes, start, start + 4);

/// The format fields Nota relies on, from a "fmt " chunk's body.
bool _isNotaFormat(ByteData view, int start) {
  final format = view.getUint16(start, Endian.little);
  final channels = view.getUint16(start + 2, Endian.little);
  final rate = view.getUint32(start + 4, Endian.little);
  final bits = view.getUint16(start + 14, Endian.little);
  return format == _pcm && channels == 1 && rate == sampleRate && bits == _bitsPerSample;
}

/// `count` little-endian samples from `start`: a view of `bytes` when they
/// line up (a 30-minute recording is 57 MB, so no second copy), otherwise a
/// copy on an aligned buffer of its own.
Int16List _samples(Uint8List bytes, int start, int count) {
  final offset = bytes.offsetInBytes + start;
  if (_littleEndianHost && offset % _bytesPerSample == 0) return bytes.buffer.asInt16List(offset, count);
  final copy = bytes.sublist(start, start + count * _bytesPerSample);
  if (_littleEndianHost) return copy.buffer.asInt16List();
  final view = ByteData.sublistView(copy);
  return Int16List.fromList([for (var i = 0; i < count; i++) view.getInt16(i * _bytesPerSample, Endian.little)]);
}

/// The samples of a 16 kHz mono 16-bit PCM WAV, the only kind Nota stores
/// (recordings, dictation clips and imported files are all converted to it).
/// A cut-off file gives what is there of it. The samples may share `bytes`'
/// buffer: change neither while the other is in use.
Result<Int16List> readWav(Uint8List bytes) {
  if (bytes.length < _riffHeaderBytes || _ascii(bytes, 0) != 'RIFF' || _ascii(bytes, 8) != 'WAVE') {
    return const Err('not a WAV file');
  }
  final view = ByteData.sublistView(bytes);
  var formatOk = false;
  for (var offset = _riffHeaderBytes; offset + _chunkHeaderBytes <= bytes.length;) {
    final id = _ascii(bytes, offset);
    final size = view.getUint32(offset + 4, Endian.little);
    final body = offset + _chunkHeaderBytes;
    if (id == 'fmt ') formatOk = size >= _fmtBytes && body + _fmtBytes <= bytes.length && _isNotaFormat(view, body);
    if (id == 'data') {
      if (!formatOk) return const Err('expected 16 kHz mono 16-bit PCM');
      final end = math.min(body + size, bytes.length);
      return Ok(_samples(bytes, body, (end - body) ~/ _bytesPerSample));
    }
    // Chunks are padded to an even length.
    offset = body + size + size % 2;
  }
  return const Err('no audio in the WAV file');
}

void _writeAscii(ByteData view, int offset, String text) {
  for (var i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.codeUnitAt(i));
  }
}

/// The 44-byte header of a 16-bit mono PCM WAV holding `samples` samples.
Uint8List wavHeader(int samples, {int sampleRate = sampleRate}) {
  final dataBytes = samples * _bytesPerSample;
  final bytes = Uint8List(_canonicalHeaderBytes);
  final view = ByteData.sublistView(bytes);
  _writeAscii(view, 0, 'RIFF');
  view.setUint32(4, _canonicalHeaderBytes - 8 + dataBytes, Endian.little);
  _writeAscii(view, 8, 'WAVE');
  _writeAscii(view, 12, 'fmt ');
  view.setUint32(16, _fmtBytes, Endian.little);
  view.setUint16(20, _pcm, Endian.little);
  view.setUint16(22, 1, Endian.little);
  view.setUint32(24, sampleRate, Endian.little);
  view.setUint32(28, sampleRate * _bytesPerSample, Endian.little);
  view.setUint16(32, _bytesPerSample, Endian.little);
  view.setUint16(34, _bitsPerSample, Endian.little);
  _writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, Endian.little);
  return bytes;
}

/// `samples` as a WAV's little-endian bytes: a view of them on a phone
/// (little-endian already), a converted copy elsewhere.
Uint8List pcmBytes(Int16List samples) {
  if (_littleEndianHost) return Uint8List.sublistView(samples);
  final bytes = Uint8List(samples.length * _bytesPerSample);
  final view = ByteData.sublistView(bytes);
  for (var i = 0; i < samples.length; i++) {
    view.setInt16(i * _bytesPerSample, samples[i], Endian.little);
  }
  return bytes;
}

/// A 16-bit mono PCM WAV file of `samples`, as Nota stores recordings.
Uint8List encodeWav(Int16List samples, {int sampleRate = sampleRate}) =>
    (BytesBuilder(copy: false)
          ..add(wavHeader(samples.length, sampleRate: sampleRate))
          ..add(pcmBytes(samples)))
        .takeBytes();
