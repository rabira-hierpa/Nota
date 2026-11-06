import 'dart:async';
import 'dart:collection';
import 'dart:io';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:path/path.dart' as p;

import '../../../core/device.dart';
import '../../../core/result.dart';
import '../../../l10n/speech_messages.dart';
import '../../notes/data/note.dart';
import '../../notes/state/notes_store.dart';
import '../audio/wav.dart';
import '../hohe/recognizer.dart';
import '../models/model_store.dart';

/// The model a transcription is credited to, as on the desktop.
const hoheModel = 'hohe';

/// Speech to text for 16 kHz samples: Hohe in the app, a fake in tests.
abstract interface class SpeechRecognizer {
  /// `onProgress` hears the share of the audio done, now and then.
  Future<String> transcribe(Int16List samples, {void Function(double done)? onProgress});

  Future<void> release();
}

/// Puts sentence ends into a whole recording's text.
abstract interface class SentencePunctuator {
  Future<String> punctuate(String text);

  Future<void> release();
}

/// Loads the models from the models folder.
abstract interface class SpeechModelLoader {
  Future<SpeechRecognizer> loadRecognizer(String directory);

  Future<SentencePunctuator> loadPunctuator(String directory);
}

/// The real models: Hohe and the punctuation model, through ONNX Runtime.
final class HoheModelLoader implements SpeechModelLoader {
  const HoheModelLoader();

  @override
  Future<SpeechRecognizer> loadRecognizer(String directory) async => _HoheRecognizer(await Hohe.load(directory));

  @override
  Future<SentencePunctuator> loadPunctuator(String directory) async =>
      _HohePunctuator(await Punctuator.load(directory));
}

final class _HoheRecognizer implements SpeechRecognizer {
  _HoheRecognizer(this._hohe);

  final Hohe _hohe;

  @override
  Future<String> transcribe(Int16List samples, {void Function(double done)? onProgress}) =>
      _hohe.transcribe(samples, onProgress: onProgress);

  @override
  Future<void> release() => _hohe.release();
}

final class _HohePunctuator implements SentencePunctuator {
  _HohePunctuator(this._punctuator);

  final Punctuator _punctuator;

  @override
  Future<String> punctuate(String text) => _punctuator.punctuate(text);

  @override
  Future<void> release() => _punctuator.release();
}

/// The note's text with a transcript added: the transcript alone when the
/// note is empty, otherwise after a blank line, so nothing typed is lost.
String appendTranscript(String text, String transcript) =>
    text.trim().isEmpty ? transcript : '${text.trimRight()}\n\n$transcript';

/// Reads a note's recording; runs on another isolate (a 30-minute WAV is 57 MB).
Int16List? _readSamples(String path) {
  try {
    return readWav(File(path).readAsBytesSync()).valueOrNull;
  } on FileSystemException {
    return null;
  }
}

sealed class _Job {}

/// A whole recording, transcribed into its note.
final class _NoteJob extends _Job {
  _NoteJob(this.noteId);

  final String noteId;
  double? progress;
}

/// A dictation clip, transcribed for the caller.
final class _ClipJob extends _Job {
  _ClipJob(this.samples);

  final Int16List samples;
  final done = Completer<Result<String>>();
}

/// Turns speech into text with the models in [ModelStore], one job at a
/// time: a phone has memory for one Hohe run. Whole recordings are written
/// into their notes, with sentence ends; dictation clips are handed back
/// as they are. The models load on first use (or on [prepare]) and are
/// released after [releaseAfter] without one, or as soon as nothing runs
/// once Nota is in the background: iOS ends a suspended app holding that
/// much memory first. The screen is kept on while a recording is
/// transcribed, since iOS suspends Nota soon after it locks.
///
/// Recordings left waiting when Nota last closed are queued again once the
/// notes and the model files are there; the one that was running is marked
/// as interrupted instead (see [_checkInterrupted]).
///
/// Failures are kept with the note as English messages (the interface
/// translates them), never as an error's own text.
class SpeechService extends ChangeNotifier {
  SpeechService({
    required this._models,
    required this._notes,
    this._loader = const HoheModelLoader(),
    this.releaseAfter = const Duration(minutes: 5),
    this._clock = DateTime.now,
  }) : _marker = File(p.join(p.dirname(_notes.audioPath(newNoteId())), _markerName)) {
    _modelsWereReady = _models.status.isReady;
    _notesLoadFailed = _notes.loadFailed;
    _models.addListener(_modelsChanged);
    _notes.addListener(_notesChanged);
    _lifecycle = AppLifecycleListener(onStateChange: _lifecycleChanged);
    _interruptedChecked = _checkInterrupted();
    _resumeWaiting();
  }

  /// Hohe's pieces are most of a recording's work; punctuation is the rest.
  static const _hoheShare = 0.9;

  /// Beside the notes: the id of the note whose recording is being transcribed.
  static const _markerName = '.transcribing';

  final ModelStore _models;
  final NotesStore _notes;
  final SpeechModelLoader _loader;
  final DateTime Function() _clock;

  /// How long the models stay loaded after their last use.
  final Duration releaseAfter;

  final File _marker;
  late final AppLifecycleListener _lifecycle;
  final _waiting = ListQueue<_Job>();
  _Job? _running;
  SpeechRecognizer? _recognizer;
  Future<SpeechRecognizer?>? _recognizerLoad;
  SentencePunctuator? _punctuator;
  Future<void> _released = Future<void>.value();
  Future<void> _interruptedChecked = Future<void>.value();
  Timer? _releaseTimer;
  bool _loading = false;
  bool _disposed = false;
  bool _modelsWereReady = false;
  bool _notesLoadFailed = false;
  bool _inBackground = false;

  /// The note each running dictation types into, by dictation ([dictating]).
  final _dictations = <Object, String>{};

  /// Whether the note's recording is waiting for, or going through, Hohe.
  bool isTranscribing(String noteId) => _isJobFor(_running, noteId) || _waiting.any((job) => _isJobFor(job, noteId));

  /// The share of the note's recording done once its turn has come (0 while
  /// the model loads); null while it waits, or when it isn't queued.
  double? progress(String noteId) {
    final job = _running;
    return job is _NoteJob && job.noteId == noteId ? job.progress : null;
  }

  /// Whether the speech model is being loaded (it takes a few seconds).
  bool get isLoadingModel => _loading;

  /// Whether the speech model is in memory.
  bool get isModelLoaded => _recognizer != null;

  /// Queues the note's recording. On success the transcript becomes the
  /// note's text, or is added after it; on failure the note keeps why.
  void transcribeNote(String noteId) {
    if (_disposed || isTranscribing(noteId)) return;
    _waiting.add(_NoteJob(noteId));
    notifyListeners();
    _pump();
  }

  /// One dictation clip's text, without punctuation. Clips go ahead of
  /// recordings still waiting (dictation is live), but never interrupt the
  /// one running.
  Future<Result<String>> transcribeClip(Int16List samples) {
    if (_disposed) return Future.value(Err(_en.clipFailed));
    final job = _ClipJob(samples);
    final waiting = _waiting.toList();
    final firstNote = waiting.indexWhere((queued) => queued is _NoteJob);
    _waiting
      ..clear()
      ..addAll(firstNote < 0 ? [...waiting, job] : [...waiting.take(firstNote), job, ...waiting.skip(firstNote)]);
    _pump();
    return job.done.future;
  }

  /// Dictation by [owner] into [noteId] has started ([on]), or typed its
  /// last words. Meanwhile the models stay loaded, even in the background
  /// (its last clip is still to come when the app is put away), and the
  /// note's recording isn't offered for a whole transcription (its words are
  /// still being typed).
  void dictating(Object owner, String noteId, bool on) {
    if (on ? _dictations[owner] == noteId : !_dictations.containsKey(owner)) return;
    if (on) {
      _dictations[owner] = noteId;
    } else {
      _dictations.remove(owner);
    }
    _notify();
    if (_dictations.isEmpty && _idle) _scheduleRelease();
  }

  /// Whether dictation into the note runs, or is still typing its last words.
  bool isDictating(String noteId) => _dictations.containsValue(noteId);

  /// Loads Hohe ahead of use, as dictation starts, so the first clip doesn't
  /// wait for it. Let go again after [releaseAfter] if nothing uses it.
  void prepare() {
    if (_disposed || !_models.status.isReady || _recognizerLoad != null) return;
    _releaseTimer?.cancel();
    void idle(Object? _) {
      if (_idle) _scheduleRelease();
    }

    unawaited(_loadRecognizer().then(idle, onError: idle));
  }

  @override
  void dispose() {
    _disposed = true;
    _models.removeListener(_modelsChanged);
    _notes.removeListener(_notesChanged);
    _lifecycle.dispose();
    unawaited(Device.keepScreenOn(this, false));
    _releaseTimer?.cancel();
    for (final job in _waiting) {
      if (job is _ClipJob) job.done.complete(Err(_en.clipFailed));
    }
    _waiting.clear();
    unawaited(_releaseNow());
    super.dispose();
  }

  static SpeechMessages get _en => SpeechMessages.en;

  static bool _isJobFor(_Job? job, String noteId) => job is _NoteJob && job.noteId == noteId;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  /// Nothing runs, and nothing waiting can run now: in the background a
  /// recording waits for Nota to come back ([_pump]).
  bool get _idle => _running == null && !_waiting.any((job) => !_inBackground || job is _ClipJob);

  void _pump() {
    if (_disposed) return;
    // In the background only dictation's clips run (they go ahead of
    // recordings): a recording waits rather than load Hohe just as iOS
    // suspends Nota, which would end it as interrupted.
    if (_running == null && _waiting.isNotEmpty && (!_inBackground || _waiting.first is _ClipJob)) {
      final job = _running = _waiting.removeFirst();
      _releaseTimer?.cancel();
      unawaited(_run(job).whenComplete(() => _finished(job)));
    }
    // On while a recording is running or waiting; dictation keeps the screen on itself.
    unawaited(Device.keepScreenOn(this, _running is _NoteJob || _waiting.any((job) => job is _NoteJob)));
  }

  void _finished(_Job job) {
    _running = null;
    if (_disposed) {
      unawaited(_releaseNow());
      return;
    }
    notifyListeners();
    if (_idle) {
      if (_models.status.isReady) {
        _scheduleRelease();
      } else {
        unawaited(_releaseNow());
      }
    }
    _pump();
  }

  Future<void> _run(_Job job) => switch (job) {
    _NoteJob() => _runNote(job),
    _ClipJob() => _runClip(job),
  };

  Future<void> _runClip(_ClipJob job) async {
    Result<String> result = Err(_en.clipFailed);
    try {
      result = await _transcribeClip(job.samples);
    } finally {
      job.done.complete(result);
    }
  }

  Future<Result<String>> _transcribeClip(Int16List samples) async {
    if (!_models.status.isReady) return Err(_en.noModel);
    try {
      final recognizer = await _loadRecognizer();
      if (recognizer == null) return Err(_en.cantStart);
      return Ok((await recognizer.transcribe(samples)).trim());
    } on OutOfMemoryError {
      await _releaseNow();
      return Err(_en.outOfMemory);
    } on Exception {
      await _releaseNow();
      return Err(_en.clipFailed);
    } on Error {
      // A bug or a plugin answering in a way not foreseen: still one clip's failure.
      await _releaseNow();
      return Err(_en.clipFailed);
    }
  }

  Future<void> _runNote(_NoteJob job) async {
    _setProgress(job, 0);
    await _interruptedChecked;
    await _mark(job.noteId);
    try {
      final failure = await _transcribeNote(job);
      if (failure != null && !_disposed && _notes.byId(job.noteId)?.audio != null) {
        await _notes.setTranscription(job.noteId, TranscriptionFailed(failure));
      }
    } finally {
      await _unmark();
    }
  }

  /// Transcribes the note's recording into it; returns why it failed, or
  /// null (also when the note or its recording went away meanwhile).
  Future<String?> _transcribeNote(_NoteJob job) async {
    if (_notes.byId(job.noteId)?.audio == null) return null;
    if (!_models.status.isReady) return _en.noModel;
    try {
      final samples = await _readAside(_notes.audioPath(job.noteId));
      if (samples == null) return _en.failed;
      final recognizer = await _loadRecognizer();
      if (recognizer == null) return _en.cantStart;
      final words = await recognizer.transcribe(samples, onProgress: (done) => _setProgress(job, done * _hoheShare));
      if (words.trim().isEmpty) return _en.nothingHeard;
      final text = await _punctuate(words.trim());
      _setProgress(job, 1);
      final note = _notes.byId(job.noteId);
      if (note == null || _disposed) return null;
      final done = TranscriptionDone(transcribedAt: _clock(), model: hoheModel);
      await _notes.setTranscription(job.noteId, done, text: appendTranscript(note.text, text));
      return null;
    } on OutOfMemoryError {
      await _releaseNow();
      return _en.outOfMemory;
    } on RemoteError {
      // Reading the recording failed on its isolate.
      return _en.failed;
    } on Exception {
      await _releaseNow();
      return _en.failed;
    } on Error {
      // A bug or a plugin answering in a way not foreseen: the note says it failed.
      await _releaseNow();
      return _en.failed;
    }
  }

  /// Reads the recording on another isolate. Static, so the closure carries
  /// only the path across.
  static Future<Int16List?> _readAside(String path) => Isolate.run(() => _readSamples(path));

  /// Sentence ends are a nicety: when the punctuation model fails, the
  /// words are kept as Hohe heard them.
  Future<String> _punctuate(String words) async {
    try {
      final punctuator = _punctuator ??= await _loader.loadPunctuator(_models.directory);
      return await punctuator.punctuate(words);
    } on Exception {
      final punctuator = _punctuator;
      _punctuator = null;
      await _quietly(punctuator?.release);
      return words;
    }
  }

  /// Hohe, loaded if it isn't; null when it can't load. One load at a time:
  /// a second caller waits for the load under way (two would need twice the memory).
  Future<SpeechRecognizer?> _loadRecognizer() {
    final loaded = _recognizer;
    if (loaded != null) return Future.value(loaded);
    return _recognizerLoad ??= _load().whenComplete(() => _recognizerLoad = null);
  }

  Future<SpeechRecognizer?> _load() async {
    _loading = true;
    _notify();
    try {
      // A release still closing frees its memory before the next load takes more.
      await _released;
      final recognizer = await _loader.loadRecognizer(_models.directory);
      // Disposed, or the files deleted, while it loaded: nothing may use it.
      if (_disposed || !_models.status.isReady) {
        await _quietly(recognizer.release);
        return null;
      }
      return _recognizer = recognizer;
    } on Exception {
      return null;
    } finally {
      _loading = false;
      _notify();
    }
  }

  void _setProgress(_NoteJob job, double value) {
    job.progress = value.clamp(0, 1).toDouble();
    _notify();
  }

  void _scheduleRelease() {
    _releaseTimer?.cancel();
    if (_recognizer == null && _punctuator == null) return;
    // Dictation's next clip may come at any moment; its end schedules this again.
    if (_dictations.isNotEmpty) return;
    // In the background nothing new comes soon, and the memory matters most.
    if (_inBackground) {
      unawaited(_releaseNow());
      return;
    }
    _releaseTimer = Timer(releaseAfter, () {
      if (_running == null && _dictations.isEmpty) unawaited(_releaseNow());
    });
  }

  /// Frees the models' memory now.
  Future<void> _releaseNow() {
    _releaseTimer?.cancel();
    final recognizer = _recognizer;
    final punctuator = _punctuator;
    _recognizer = null;
    _punctuator = null;
    if (recognizer == null && punctuator == null) return _released;
    return _released = _released.then((_) async {
      await _quietly(recognizer?.release);
      await _quietly(punctuator?.release);
    });
  }

  /// Gone to the background: the models are let go now if nothing runs, or
  /// when the last job or dictation ends ([_finished], [dictating]); never
  /// in the middle of one. Back again: the recordings that waited run.
  void _lifecycleChanged(AppLifecycleState state) {
    final wasInBackground = _inBackground;
    _inBackground = switch (state) {
      AppLifecycleState.hidden || AppLifecycleState.paused || AppLifecycleState.detached => true,
      AppLifecycleState.resumed || AppLifecycleState.inactive => false,
    };
    if (_inBackground && _idle) _scheduleRelease();
    if (wasInBackground && !_inBackground) _pump();
  }

  /// Model files deleted (or damaged) while loaded: let the model go. Model
  /// files just added: transcribe the recordings that waited for them.
  void _modelsChanged() {
    final ready = _models.status.isReady;
    final added = ready && !_modelsWereReady;
    _modelsWereReady = ready;
    if (!ready && _running == null) unawaited(_releaseNow());
    if (added) _resumeWaiting();
  }

  /// Notes read again after a failed start: look at them as at a start.
  void _notesChanged() {
    final loaded = _notesLoadFailed && !_notes.loadFailed;
    _notesLoadFailed = _notes.loadFailed;
    if (!loaded) return;
    _interruptedChecked = _checkInterrupted();
    _resumeWaiting();
  }

  /// Queues every recording still waiting for its first transcription,
  /// oldest first: those Nota closed on before their turn came. Only notes
  /// with no text of their own: the transcript is added to a note's text,
  /// so one dictated into (with a gap) is left for the person to start.
  void _resumeWaiting() {
    if (_disposed || _notes.loadFailed || !_models.status.isReady) return;
    final waiting = _notes.all.where(_isWaiting).toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    unawaited(_queueIfRecorded([for (final note in waiting) note.id]));
  }

  Future<void> _queueIfRecorded(List<String> ids) async {
    // The one interrupted is marked first, so it isn't queued.
    await _interruptedChecked;
    for (final id in ids) {
      final note = _notes.byId(id);
      if (_disposed || note == null || !_isWaiting(note)) continue;
      if (await File(_notes.audioPath(id)).exists()) transcribeNote(id);
    }
  }

  static bool _isWaiting(Note note) =>
      note.audio?.transcription is TranscriptionPending && note.text.trim().isEmpty && !note.isTrashed;

  /// The recording Hohe was transcribing when Nota last closed is marked as
  /// interrupted, not run again: if it was what closed Nota (the system
  /// ends an app that takes too much memory), it would close it again at
  /// every start. Waits for the notes to be read.
  Future<void> _checkInterrupted() async {
    if (_notes.loadFailed) return;
    final String id;
    try {
      id = (await _marker.readAsString()).trim();
      await _marker.delete();
    } on FileSystemException {
      return;
    }
    final note = _notes.byId(id);
    if (_disposed || note?.audio?.transcription is! TranscriptionPending) return;
    await _notes.setTranscription(id, TranscriptionFailed(_en.interrupted));
  }

  /// Notes which recording is being transcribed, in case Nota is closed meanwhile.
  Future<void> _mark(String noteId) async {
    try {
      await _marker.writeAsString(noteId, flush: true);
    } on FileSystemException {
      // Without the mark, a crash on this recording would be tried again at the next start.
    }
  }

  Future<void> _unmark() async {
    try {
      await _marker.delete();
    } on FileSystemException {
      // Never written.
    }
  }

  /// A failed release can't be acted on: the session is gone either way.
  static Future<void> _quietly(Future<void> Function()? release) async {
    if (release == null) return;
    try {
      await release();
    } on Exception {
      // Released with its error.
    }
  }
}
