import 'dart:math' as math;
import 'dart:typed_data';

import 'wav.dart';

/// How live microphone audio is cut into dictation clips.
final class SegmenterOptions {
  const SegmenterOptions({
    this.sampleRate = 16000,
    this.speechRms = 0.01,
    this.pauseMs = 500,
    this.maxClipMs = 20000,
    this.cutSearchMs = 5000,
    this.minSpeechMs = 150,
    this.leadInMs = 300,
  });

  final int sampleRate;

  /// A 30 ms frame whose RMS reaches this share of full scale counts as speech
  /// (about -40 dBFS). The desktop's float scale: a 16-bit sample s is s / 32768.
  final double speechRms;

  /// Silence this long after speech ends a clip.
  final int pauseMs;

  /// Speech that runs this long without a pause is cut at its quietest moment…
  final int maxClipMs;

  /// …within this final stretch.
  final int cutSearchMs;

  /// Clips with less speech than this (a click, a cough) are dropped.
  final int minSpeechMs;

  /// Silence kept ahead of the first word so it isn't clipped.
  final int leadInMs;
}

const defaultSegmenterOptions = SegmenterOptions(sampleRate: sampleRate);

const _frameMs = 30;
const _msPerSecond = 1000;

/// What a 16-bit sample is on the float scale the thresholds use (-1…1).
const _fullScale = 32768.0;

final class _Frame {
  const _Frame(this.samples, this.rms, {required this.speech});

  final Int16List samples;
  final double rms;
  final bool speech;
}

double _rootMeanSquare(Int16List samples) {
  if (samples.isEmpty) return 0;
  var sum = 0;
  for (final sample in samples) {
    sum += sample * sample;
  }
  return math.sqrt(sum / samples.length) / _fullScale;
}

Int16List _join(List<Int16List> parts) {
  final joined = Int16List(parts.fold(0, (length, part) => length + part.length));
  var offset = 0;
  for (final part in parts) {
    joined.setAll(offset, part);
    offset += part.length;
  }
  return joined;
}

/// Splits live microphone audio (16-bit samples, as the record package streams
/// them) into clips at the speaker's pauses, so dictation can transcribe each
/// stretch of speech as soon as it ends. Silence on its own never becomes a
/// clip (speech models invent text for it).
class SpeechSegmenter {
  SpeechSegmenter([this._options = defaultSegmenterOptions])
    : _frameSize = (_options.sampleRate * _frameMs / _msPerSecond).round(),
      _pauseFrames = _frames(_options.pauseMs),
      _maxFrames = _frames(_options.maxClipMs),
      _cutSearchFrames = _frames(_options.cutSearchMs),
      _minSpeechFrames = _frames(_options.minSpeechMs),
      _leadInFrames = _frames(_options.leadInMs);

  final SegmenterOptions _options;
  final int _frameSize;
  final int _pauseFrames;
  final int _maxFrames;
  final int _cutSearchFrames;
  final int _minSpeechFrames;
  final int _leadInFrames;

  /// Samples still short of a whole frame.
  Int16List _partial = Int16List(0);
  final List<_Frame> _buffered = [];

  static int _frames(int ms) => math.max(1, (ms / _frameMs).round());

  /// Feeds microphone samples; returns the clips this completed, oldest first.
  List<Int16List> push(Int16List samples) {
    final pending = _join([_partial, samples]);
    final clips = <Int16List>[];
    var offset = 0;
    for (; offset + _frameSize <= pending.length; offset += _frameSize) {
      final clip = _addFrame(Int16List.sublistView(pending, offset, offset + _frameSize));
      if (clip != null) clips.add(clip);
    }
    _partial = pending.sublist(offset);
    return clips;
  }

  /// The speech still waiting for a pause, once the microphone stops.
  Int16List? flush() {
    if (_partial.isNotEmpty) _buffered.add(_toFrame(_partial));
    _partial = Int16List(0);
    return _take(_buffered.length);
  }

  _Frame _toFrame(Int16List samples) {
    final rms = _rootMeanSquare(samples);
    return _Frame(samples, rms, speech: rms >= _options.speechRms);
  }

  Int16List? _addFrame(Int16List samples) {
    _buffered.add(_toFrame(samples));
    if (!_buffered.any((frame) => frame.speech)) {
      // Before any speech, keep only a short lead-in of silence.
      if (_buffered.length > _leadInFrames) _buffered.removeAt(0);
      return null;
    }
    if (_trailingSilence() >= _pauseFrames) return _take(_buffered.length);
    if (_buffered.length >= _maxFrames) return _take(_quietestCut());
    return null;
  }

  int _trailingSilence() {
    var count = 0;
    for (var index = _buffered.length - 1; index >= 0 && !_buffered[index].speech; index--) {
      count++;
    }
    return count;
  }

  /// Frames up to and including the quietest one near the end.
  int _quietestCut() {
    var quietest = math.max(0, _buffered.length - _cutSearchFrames);
    for (var index = quietest + 1; index < _buffered.length; index++) {
      if (_buffered[index].rms < _buffered[quietest].rms) quietest = index;
    }
    return quietest + 1;
  }

  /// Removes the first `count` frames; returns them as a clip if they hold enough speech.
  Int16List? _take(int count) {
    final taken = _buffered.sublist(0, count);
    _buffered.removeRange(0, count);
    final speech = taken.where((frame) => frame.speech).length;
    return speech >= _minSpeechFrames ? _join([for (final frame in taken) frame.samples]) : null;
  }
}
