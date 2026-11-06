import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:record/record.dart' show RecordState;

import '../../../core/device.dart';
import '../../../core/result.dart';
import '../../notes/data/note.dart';
import '../../notes/state/notes_store.dart';
import '../audio/recorder.dart';
import '../audio/speech_segmenter.dart';
import '../audio/wav.dart';
import 'speech_service.dart';

enum DictationPhase {
  idle,
  starting,
  listening,

  /// Stopped; the last clips are still being transcribed.
  finishing,
}

const _msPerSecond = 1000;

/// Shorter than this, the audio isn't worth keeping with the note.
const _minSamples = sampleRate * 300 ~/ _msPerSecond;

/// Stop a little before the cap, so the kept recording never exceeds it.
const _autoStopSamples = sampleRate * (maxDurationMs - 2000) ~/ _msPerSecond;

/// After Stop, the microphone's last buffers still arrive; the stream ends
/// after them. This long at most is waited for that end.
const _drainTimeout = Duration(seconds: 1);

/// The recording is written to its file in blocks of about this many bytes.
const _writeBlockBytes = 1 << 20;

/// No samples at all (not just quiet ones) for this long while listening:
/// the microphone was taken away without a word. iOS goes quiet like this
/// for a call, Siri or a route change.
const _defaultStallAfter = Duration(milliseconds: 1500);

final _space = RegExp(r'\s');

/// [value] with dictated [text] typed at its cursor (replacing a selection),
/// or at the end when it has none, and the cursor after it. A space keeps it
/// apart from a word on either side. Plain text: it is inserted exactly as
/// heard.
TextEditingValue insertDictated(TextEditingValue value, String text) {
  final selection = value.selection;
  final length = value.text.length;
  final start = selection.isValid ? selection.start.clamp(0, length) : length;
  final end = selection.isValid ? selection.end.clamp(start, length) : length;
  final before = value.text.substring(0, start);
  final after = value.text.substring(end);
  final lead = before.isNotEmpty && !_space.hasMatch(before[before.length - 1]) ? ' ' : '';
  final trail = after.isNotEmpty && !_space.hasMatch(after[0]) ? ' ' : '';
  return TextEditingValue(
    text: '$before$lead$text$trail$after',
    selection: TextSelection.collapsed(offset: start + lead.length + text.length),
  );
}

/// Dictation into one note: the microphone is cut into clips at each pause
/// ([SpeechSegmenter]), each clip goes to [SpeechService.transcribeClip] as
/// soon as it ends (Hohe is loaded as the microphone starts), and its text
/// is typed through `insert` in the order spoken while the person keeps
/// talking. When dictation stops, the audio is kept with the note if it has
/// no recording yet. A microphone taken away (a call, Siri, another app)
/// stops dictation as Stop would, with [RecorderError.interrupted].
class DictationController extends ChangeNotifier {
  DictationController({
    required this.noteId,
    required this._speech,
    required this._notes,
    required this._insert,
    Recorder Function() recorder = Recorder.new,
    this._clock = DateTime.now,
    this._stallAfter = _defaultStallAfter,
  }) : _makeRecorder = recorder;

  final String noteId;
  final SpeechService _speech;
  final NotesStore _notes;
  final Recorder Function() _makeRecorder;
  final DateTime Function() _clock;

  /// How long the microphone may send nothing before it counts as taken away.
  final Duration _stallAfter;
  void Function(String text) _insert;

  DictationPhase _phase = DictationPhase.idle;
  String? _error;
  int _pendingClips = 0;
  bool _stopWanted = false;
  bool _disposed = false;

  Recorder? _recorder;
  StreamSubscription<Int16List>? _subscription;
  StreamSubscription<RecordState>? _states;

  /// Restarted by every chunk while listening; see [_stalled].
  Timer? _watchdog;
  final _sinceChunk = Stopwatch();

  Completer<void> _streamEnded = Completer<void>();
  SpeechSegmenter _segmenter = SpeechSegmenter();
  final _chunks = <Int16List>[];
  int _sampleCount = 0;

  /// The loudest sample so far, to tell a silent microphone without going
  /// over the whole recording again at the end.
  int _peak = 0;
  Future<void> _typed = Future<void>.value();

  /// A clip failed, so the text has a gap: the recording stays to be transcribed whole.
  bool _incomplete = false;

  DictationPhase get phase => _phase;

  bool get isActive => _phase != DictationPhase.idle;

  /// Why dictation couldn't start or was stopped, or the last clip failed: a
  /// [RecorderError] or an English speech message (see `Messages.translate`).
  /// Dictation keeps listening after a failed clip.
  String? get error => _error;

  /// Clips sent and not yet typed.
  int get pendingClips => _pendingClips;

  /// How long this session has listened.
  Duration get elapsed => Duration(milliseconds: _sampleCount * _msPerSecond ~/ sampleRate);

  void clearError() {
    if (_error == null) return;
    _error = null;
    _notify();
  }

  /// Starts listening (asking for the microphone the first time).
  Future<void> start() async {
    if (_phase != DictationPhase.idle || _disposed) return;
    _resetSession();
    _setPhase(DictationPhase.starting);
    _speech.dictating(this, noteId, true);
    unawaited(Device.useAudio(this, true));
    final recorder = _recorder = _makeRecorder();
    final started = await recorder.startStream();
    switch (started) {
      case Err(:final message):
        _error = message;
        _recorder = null;
        await recorder.dispose();
        unawaited(Device.useAudio(this, false));
        _speech.dictating(this, noteId, false);
        _setPhase(DictationPhase.idle);
      case Ok(value: final samples):
        final ended = _streamEnded;
        _subscription = samples.listen(
          _receive,
          onError: (Object _) => _interrupted(),
          onDone: () {
            if (!ended.isCompleted) ended.complete();
            _interrupted();
          },
        );
        _setPhase(DictationPhase.listening);
        // Stopped (or the note closed) while the microphone was starting.
        if (_stopWanted || _disposed) return stop();
        _states = recorder.states().listen(_recorderState, onError: (Object _) => _interrupted());
        _armWatchdog();
        // Auto-Lock would end the dictation: iOS suspends Nota soon after the screen locks.
        unawaited(Device.keepScreenOn(this, true));
        // The first clip comes a few seconds from now: have Hohe ready by then.
        _speech.prepare();
    }
  }

  /// Stops listening, keeps the audio with the note, and types what is left.
  Future<void> stop() async {
    if (_phase == DictationPhase.starting) {
      _stopWanted = true;
      return;
    }
    if (_phase != DictationPhase.listening) return;
    _setPhase(DictationPhase.finishing);
    _stopWatching();
    unawaited(Device.keepScreenOn(this, false));
    final recorder = _recorder;
    _recorder = null;
    await recorder?.stop();
    // What the microphone heard just before Stop is still on its way.
    await _streamEnded.future.timeout(_drainTimeout, onTimeout: () {});
    await _subscription?.cancel();
    _subscription = null;
    await recorder?.dispose();
    // The music or podcast the person paused carries on.
    unawaited(Device.useAudio(this, false));
    final last = _segmenter.flush();
    if (last != null) _send(last);
    try {
      // On disk before the last clips are typed: iOS may suspend Nota, and
      // end it, in the meantime.
      final kept = await _keepAudio();
      await _typed;
      await _settleAudio(kept);
    } finally {
      _speech.dictating(this, noteId, false);
      _setPhase(DictationPhase.idle);
    }
  }

  /// The editor went away: later text is added to the end of the note, and
  /// dictation stops.
  void detach() {
    _insert = _appendToNote;
    unawaited(stop());
  }

  @override
  void dispose() {
    _disposed = true;
    // The editor (and its text controller) is going too: whatever is still
    // on its way, even while finishing, goes to the note itself.
    detach();
    _stopWatching();
    unawaited(Device.keepScreenOn(this, false));
    super.dispose();
  }

  /// The system paused or stopped the microphone (a call, Siri, another app
  /// taking it): nothing more will come, so dictation stops as Stop would,
  /// keeping the audio and typing what was heard.
  void _recorderState(RecordState state) {
    if (state != RecordState.record) _interrupted();
  }

  void _interrupted() {
    if (_phase != DictationPhase.listening) return;
    _error = RecorderError.interrupted;
    unawaited(stop());
  }

  void _armWatchdog() {
    _watchdog?.cancel();
    _sinceChunk
      ..reset()
      ..start();
    _watchdog = Timer(_stallAfter, _stalled);
  }

  /// No chunk for [_stallAfter]. A timer that fires well late means Nota
  /// itself was busy (or paused in a debugger), and chunks may be queued
  /// behind it: it looks again rather than stopping.
  void _stalled() {
    if (_phase != DictationPhase.listening) return;
    if (_sinceChunk.elapsed > _stallAfter * 1.5) return _armWatchdog();
    _interrupted();
  }

  void _stopWatching() {
    _watchdog?.cancel();
    _watchdog = null;
    _sinceChunk.stop();
    unawaited(_states?.cancel());
    _states = null;
  }

  void _resetSession() {
    _error = null;
    _stopWanted = false;
    _incomplete = false;
    _segmenter = SpeechSegmenter();
    _streamEnded = Completer<void>();
    _chunks.clear();
    _sampleCount = 0;
    _peak = 0;
    _pendingClips = 0;
    _typed = Future<void>.value();
  }

  /// Takes the microphone's samples while listening, and those still
  /// arriving after Stop.
  void _receive(Int16List samples) {
    if (_phase != DictationPhase.listening && _phase != DictationPhase.finishing) return;
    final second = elapsed.inSeconds;
    _chunks.add(samples);
    _sampleCount += samples.length;
    if (_peak < silentPeak) _peak = math.max(_peak, peakOf(samples));
    for (final clip in _segmenter.push(samples)) {
      _send(clip);
    }
    if (_phase != DictationPhase.listening) return;
    _armWatchdog();
    if (_sampleCount >= _autoStopSamples) unawaited(stop());
    // The elapsed time is shown in seconds: no need to rebuild for every chunk.
    if (elapsed.inSeconds != second) _notify();
  }

  /// Each clip goes to Hohe at once, ahead of any recording queued meanwhile
  /// (the service runs clips in the order sent); the texts are typed one
  /// after another, in the order spoken.
  void _send(Int16List clip) {
    _pendingClips++;
    _notify();
    final text = _speech.transcribeClip(clip);
    _typed = _typed.then((_) async {
      switch (await text) {
        case Ok(:final value):
          if (value.isNotEmpty) _insert(value);
        case Err(:final message):
          _incomplete = true;
          _error = message;
      }
      _pendingClips--;
      _notify();
    });
  }

  void _appendToNote(String text) {
    final note = _notes.byId(noteId);
    if (note == null) return;
    final value = insertDictated(TextEditingValue(text: note.text), text);
    unawaited(_notes.updateText(noteId, value.text));
  }

  /// Writes the recording and attaches it to the note, before the last clips
  /// are typed, as waiting to be transcribed: if Nota is ended meanwhile,
  /// the text has a gap and the recording is there to be transcribed whole.
  /// A note keeps one recording: the first one spoken into it. Returns what
  /// was attached, if anything.
  Future<NoteAudio?> _keepAudio() async {
    try {
      if (_sampleCount < _minSamples || _peak < silentPeak) return null;
      final note = _notes.byId(noteId);
      if (note == null || note.audio != null || note.isTrashed) return null;
      if (!await _writeWav(_notes.audioPath(noteId))) return null;
      final durationMs = _sampleCount * _msPerSecond ~/ sampleRate;
      final audio = NoteAudio(durationMs: durationMs, transcription: const TranscriptionPending());
      await _notes.attachAudio(noteId, audio);
      return audio;
    } finally {
      _chunks.clear();
    }
  }

  /// Once every clip is typed, the recording [kept] counts as transcribed,
  /// unless a clip failed: with a gap in the text, it stays to be transcribed
  /// whole. Left alone if the note's recording changed or is being
  /// transcribed meanwhile.
  Future<void> _settleAudio(NoteAudio? kept) async {
    if (_sampleCount >= _minSamples && _peak < silentPeak) _error = RecorderError.silent;
    if (kept == null || _incomplete) return;
    if (!identical(_notes.byId(noteId)?.audio, kept) || _speech.isTranscribing(noteId)) return;
    await _notes.setTranscription(noteId, TranscriptionDone(transcribedAt: _clock(), model: hoheModel));
  }

  /// Writes the chunks heard to a WAV file a block at a time, rather than
  /// joining them first (a 30-minute dictation is 57 MB). False if it failed.
  Future<bool> _writeWav(String path) async {
    final sink = File(path).openWrite();
    try {
      sink.add(wavHeader(_sampleCount));
      final block = BytesBuilder(copy: false);
      for (final chunk in _chunks) {
        block.add(pcmBytes(chunk));
        if (block.length >= _writeBlockBytes) sink.add(block.takeBytes());
      }
      sink.add(block.takeBytes());
      await sink.close();
      return true;
    } on FileSystemException {
      await _deleteQuietly(path);
      return false;
    }
  }

  static Future<void> _deleteQuietly(String path) async {
    try {
      await File(path).delete();
    } on FileSystemException {
      // Never written.
    }
  }

  void _setPhase(DictationPhase phase) {
    _phase = phase;
    _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }
}
