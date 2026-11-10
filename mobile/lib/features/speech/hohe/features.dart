import 'dart:math' as math;
import 'dart:typed_data';

import '../audio/wav.dart';

// Hohe's input: SeamlessM4T filter banks, as transformers'
// SeamlessM4TFeatureExtractor makes them (Kaldi-style 25 ms frames every
// 10 ms, 80 log-mel bins, each bin normalised over the clip, frames paired).
// A port of the desktop's electron/speech/features.ts; parity with Python is
// tested against fixtures from scripts/build_speech_models.py.

const _frameLength = 400;
const _hopLength = 160;
const _fftLength = 512;
const _fftBits = 9;
const _frequencyBins = _fftLength ~/ 2 + 1;
const _melBins = 80;
const _minFrequency = 20.0;
const _preemphasis = 0.97;
const _poveyPower = 0.85;
const _melFloor = 1.192092955078125e-7;
const _varianceEpsilon = 1e-7;

/// Frames are paired into one step of the model's input.
const _stride = 2;

/// What transformers pads an odd last frame with (preprocessor_config.json).
const _paddingValue = 1.0;

/// The width of one step of Hohe's `input_features`.
const featureSize = _melBins * _stride;

/// The fewest samples that make two frames (the variance needs two).
const minSamples = _frameLength + _hopLength;

/// Kaldi's mel scale.
double _hertzToMel(double hertz) => 1127 * math.log(1 + hertz / 700);

/// np.hanning(400) ** 0.85: Kaldi's Povey window.
Float64List _poveyWindow() {
  final window = Float64List(_frameLength);
  for (var n = 0; n < _frameLength; n++) {
    window[n] = math.pow(0.5 - 0.5 * math.cos(2 * math.pi * n / (_frameLength - 1)), _poveyPower).toDouble();
  }
  return window;
}

/// One mel bin's triangular filter: its weights over the frequency bins it covers.
final class _MelFilter {
  const _MelFilter(this.first, this.weights);

  /// The first frequency bin with a weight above zero.
  final int first;
  final Float64List weights;
}

/// Triangular filters laid out in mel space, as transformers'
/// mel_filter_bank(mel_scale="kaldi", triangularize_in_mel_space=True).
/// Only each filter's non-zero span is kept: adding the zeros changes no sum.
List<_MelFilter> _melFilters() {
  final melMin = _hertzToMel(_minFrequency);
  final melMax = _hertzToMel(sampleRate / 2);
  final step = (melMax - melMin) / (_melBins + 1);
  final centres = List<double>.generate(_melBins + 2, (i) => i == _melBins + 1 ? melMax : melMin + i * step);
  final binWidth = sampleRate / ((_frequencyBins - 1) * 2);
  final binMels = List<double>.generate(_frequencyBins, (bin) => _hertzToMel(binWidth * bin));
  return List<_MelFilter>.generate(_melBins, (m) {
    final weights = Float64List(_frequencyBins);
    var first = _frequencyBins;
    var last = -1;
    for (var bin = 0; bin < _frequencyBins; bin++) {
      final rising = (binMels[bin] - centres[m]) / (centres[m + 1] - centres[m]);
      final falling = (centres[m + 2] - binMels[bin]) / (centres[m + 2] - centres[m + 1]);
      weights[bin] = math.max(0.0, math.min(rising, falling));
      if (weights[bin] > 0) {
        first = math.min(first, bin);
        last = bin;
      }
    }
    return last < first ? _MelFilter(0, Float64List(0)) : _MelFilter(first, weights.sublist(first, last + 1));
  });
}

/// Bit-reversed order for a radix-2 FFT of _fftLength points.
Uint16List _bitReversed() {
  final reversed = Uint16List(_fftLength);
  for (var i = 0; i < _fftLength; i++) {
    var r = 0;
    for (var b = 0; b < _fftBits; b++) {
      r |= ((i >> b) & 1) << (_fftBits - 1 - b);
    }
    reversed[i] = r;
  }
  return reversed;
}

Float64List _twiddles(double Function(double) wave, double sign) =>
    Float64List.fromList([for (var k = 0; k < _fftLength ~/ 2; k++) sign * wave(2 * math.pi * k / _fftLength)]);

final _window = _poveyWindow();
final _filters = _melFilters();
final _reversed = _bitReversed();
final _cos = _twiddles(math.cos, 1);
final _sin = _twiddles(math.sin, -1);

/// Working buffers for one clip's frames, reused frame after frame.
final class _Scratch {
  final frame = Float64List(_frameLength);
  final re = Float64List(_fftLength);
  final im = Float64List(_fftLength);
  final power = Float64List(_frequencyBins);

  /// Rounds a double to float32, as Math.fround does.
  final float32 = Float32List(1);
}

/// In-place radix-2 FFT of `re`/`im`, already in bit-reversed order.
void _fft(Float64List re, Float64List im) {
  for (var size = 2; size <= _fftLength; size *= 2) {
    final half = size ~/ 2;
    final stride = _fftLength ~/ size;
    for (var start = 0; start < _fftLength; start += size) {
      for (var k = 0; k < half; k++) {
        final wr = _cos[k * stride];
        final wi = _sin[k * stride];
        final a = start + k;
        final b = a + half;
        final tr = re[b] * wr - im[b] * wi;
        final ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/// One frame's power spectrum into `s.power`: DC removed, pre-emphasised,
/// windowed, zero-padded to 512.
void _powerSpectrum(Int16List samples, int start, _Scratch s) {
  final frame = s.frame;
  var mean = 0.0;
  for (var i = 0; i < _frameLength; i++) {
    mean += samples[start + i];
  }
  mean /= _frameLength;
  for (var i = 0; i < _frameLength; i++) {
    frame[i] = samples[start + i] - mean;
  }
  // Backwards, so each sample is emphasised against its original neighbour.
  for (var i = _frameLength - 1; i > 0; i--) {
    frame[i] -= _preemphasis * frame[i - 1];
  }
  frame[0] *= 1 - _preemphasis;
  final re = s.re..fillRange(0, _fftLength, 0);
  final im = s.im..fillRange(0, _fftLength, 0);
  for (var i = 0; i < _frameLength; i++) {
    re[_reversed[i]] = frame[i] * _window[i];
  }
  _fft(re, im);
  // transformers keeps the spectrum as complex64, so round to float32 as it does.
  final round = s.float32;
  for (var bin = 0; bin < _frequencyBins; bin++) {
    round[0] = re[bin];
    final r = round[0];
    round[0] = im[bin];
    final i = round[0];
    s.power[bin] = r * r + i * i;
  }
}

/// Log-mel energies, [frame][mel], into the start of `out`.
void _logMel(Int16List samples, int frames, Float32List out) {
  final scratch = _Scratch();
  final power = scratch.power;
  for (var f = 0; f < frames; f++) {
    _powerSpectrum(samples, f * _hopLength, scratch);
    for (var m = 0; m < _melBins; m++) {
      final filter = _filters[m];
      final weights = filter.weights;
      var energy = 0.0;
      for (var k = 0; k < weights.length; k++) {
        energy += weights[k] * power[filter.first + k];
      }
      out[f * _melBins + m] = math.log(math.max(_melFloor, energy));
    }
  }
}

/// Each mel bin to zero mean and unit variance over the clip (sample variance, as numpy's ddof=1).
void _normalise(Float32List mel, int frames) {
  for (var m = 0; m < _melBins; m++) {
    var sum = 0.0;
    for (var f = 0; f < frames; f++) {
      sum += mel[f * _melBins + m];
    }
    final mean = sum / frames;
    var squares = 0.0;
    for (var f = 0; f < frames; f++) {
      final d = mel[f * _melBins + m] - mean;
      squares += d * d;
    }
    final scale = math.sqrt(squares / (frames - 1) + _varianceEpsilon);
    for (var f = 0; f < frames; f++) {
      mel[f * _melBins + m] = (mel[f * _melBins + m] - mean) / scale;
    }
  }
}

/// Hohe's `input_features` for 16 kHz samples: `steps` rows of [featureSize],
/// flat. Needs at least [minSamples].
({Float32List data, int steps}) hoheFeatures(Int16List samples) {
  if (samples.length < minSamples) throw ArgumentError.value(samples.length, 'samples', 'fewer than $minSamples');
  final frames = (samples.length - _frameLength) ~/ _hopLength + 1;
  final steps = (frames + _stride - 1) ~/ _stride;
  // Pairs of frames side by side are already one row each in this flat
  // layout; an odd last frame is padded as transformers pads it.
  final data = Float32List(steps * featureSize);
  _logMel(samples, frames, data);
  _normalise(data, frames);
  data.fillRange(frames * _melBins, data.length, _paddingValue);
  return (data: data, steps: steps);
}
