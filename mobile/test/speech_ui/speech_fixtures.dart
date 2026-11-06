import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/data/notes_repo.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/speech/audio/recorder.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/hohe/recognizer.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:path/path.dart' as p;
import 'package:record/record.dart' show RecordState;

/// Small stand-ins for the model files: three files of different sizes, so
/// the store can tell them apart by size as it does the real ones.
const fakeHohe = 'hohe-w8.onnx';
const fakeTokens = 'hohe.json';
const fakePunctuation = 'punct-w8.onnx';

final fakeModelBytes = <String, List<int>>{
  fakeHohe: utf8.encode('fake hohe weights, longer than the others. ' * 3),
  fakeTokens: utf8.encode('{"tokens": []}'),
  fakePunctuation: utf8.encode('fake punctuation weights'),
};

final fakeModelFiles = <String, ExpectedFile>{
  for (final MapEntry(key: name, value: bytes) in fakeModelBytes.entries)
    name: (bytes: bytes.length, sha256: sha256.convert(bytes).toString()),
};

/// Writes the fake model files (or [only] these) into [dir].
Future<void> writeFakeModels(Directory dir, {List<String>? only}) async {
  await dir.create(recursive: true);
  for (final MapEntry(key: name, value: bytes) in fakeModelBytes.entries) {
    if (only == null || only.contains(name)) await File(p.join(dir.path, name)).writeAsBytes(bytes);
  }
}

/// A model store over [dir], with the fake files in place unless [ready] is false.
Future<ModelStore> fakeModelStore(Directory dir, {bool ready = true}) async {
  if (ready) await writeFakeModels(dir);
  return ModelStore.open(directory: dir, expected: fakeModelFiles, downloadUrl: '', pick: () async => const []);
}

/// A notes store on disk in [dir].
Future<NotesStore> notesStoreIn(Directory dir) async => NotesStore.open(await NotesRepo.open(dir));

/// Adds a voice note whose recording is [samples] long (silence).
Future<Note> addVoiceNote(NotesStore notes, {String text = '', int samples = sampleRate, bool withWav = true}) async {
  final note = Note.create(
    text: text,
    audio: NoteAudio(durationMs: samples * 1000 ~/ sampleRate, transcription: const TranscriptionPending()),
  );
  if (withWav) await File(notes.audioPath(note.id)).writeAsBytes(encodeWav(Int16List(samples)));
  await notes.add(note);
  return note;
}

/// Waits (in real time) until [done] holds.
Future<void> waitFor(bool Function() done, {Duration timeout = const Duration(seconds: 10)}) async {
  final deadline = DateTime.now().add(timeout);
  while (!done()) {
    if (DateTime.now().isAfter(deadline)) throw TimeoutException('condition not met', timeout);
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
}

/// A speech model loader whose models answer as the test says.
final class FakeLoader implements SpeechModelLoader {
  /// What the recognizer hears in a piece of audio, by call (0 = first).
  String Function(int call, Int16List samples) reply = (_, _) => 'ሰላም ዓለም';

  /// Holds every transcription until completed.
  Completer<void>? gate;
  bool failLoad = false;
  bool failRun = false;
  bool failPunctuation = false;

  /// Sample counts of every transcription asked for, in order.
  final calls = <int>[];
  int recognizerLoads = 0;
  int recognizerReleases = 0;
  int punctuatorLoads = 0;
  int punctuatorReleases = 0;

  @override
  Future<SpeechRecognizer> loadRecognizer(String directory) async {
    if (failLoad) throw const SpeechModelException('Hohe could not load (SESSION_CREATION_FAILED)');
    recognizerLoads++;
    return _FakeRecognizer(this);
  }

  @override
  Future<SentencePunctuator> loadPunctuator(String directory) async {
    punctuatorLoads++;
    return _FakePunctuator(this);
  }
}

final class _FakeRecognizer implements SpeechRecognizer {
  _FakeRecognizer(this._loader);

  final FakeLoader _loader;

  @override
  Future<String> transcribe(Int16List samples, {void Function(double done)? onProgress}) async {
    final call = _loader.calls.length;
    _loader.calls.add(samples.length);
    await _loader.gate?.future;
    onProgress?.call(0.5);
    if (_loader.failRun) throw const SpeechModelException('Hohe could not transcribe (INFERENCE_ERROR)');
    onProgress?.call(1);
    return _loader.reply(call, samples);
  }

  @override
  Future<void> release() async => _loader.recognizerReleases++;
}

final class _FakePunctuator implements SentencePunctuator {
  _FakePunctuator(this._loader);

  final FakeLoader _loader;

  @override
  Future<String> punctuate(String text) async {
    if (_loader.failPunctuation) throw const SpeechModelException('punctuation failed (INFERENCE_ERROR)');
    return '$text።';
  }

  @override
  Future<void> release() async => _loader.punctuatorReleases++;
}

/// A microphone that plays back what the test feeds it.
final class FakeRecorder implements Recorder {
  final samples = StreamController<Int16List>();
  bool permission = true;
  bool stopped = false;
  bool disposed = false;

  @override
  Future<bool> hasPermission() async => permission;

  @override
  Future<Result<void>> startFile(String path) async =>
      permission ? const Ok(null) : const Err(RecorderError.permissionDenied);

  @override
  Future<Result<Stream<Int16List>>> startStream() async =>
      permission ? Ok(samples.stream) : const Err(RecorderError.permissionDenied);

  @override
  Stream<double> levels() => const Stream.empty();

  @override
  Stream<RecordState> states() => const Stream.empty();

  @override
  Future<void> pause() async {}

  @override
  Future<void> resume() async {}

  @override
  Future<void> stop() async {
    stopped = true;
    await samples.close();
  }

  @override
  Future<void> cancel() => stop();

  @override
  Future<void> dispose() async => disposed = true;
}

/// [ms] of a tone loud enough to count as speech.
Int16List tone(int ms) {
  final count = sampleRate * ms ~/ 1000;
  return Int16List.fromList([
    for (var i = 0; i < count; i++) (3000 * math.sin(i * 2 * math.pi * 220 / sampleRate)).round(),
  ]);
}

/// [ms] of silence.
Int16List silence(int ms) => Int16List(sampleRate * ms ~/ 1000);

/// Feeds [audio] to [recorder] in 100 ms chunks, as a microphone would.
Future<void> feed(FakeRecorder recorder, Int16List audio) async {
  const chunk = sampleRate ~/ 10;
  for (var start = 0; start < audio.length; start += chunk) {
    recorder.samples.add(Int16List.sublistView(audio, start, math.min(start + chunk, audio.length)));
    await Future<void>.delayed(Duration.zero);
  }
}
