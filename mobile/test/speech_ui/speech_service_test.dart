import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:nota/l10n/speech_messages.dart';
import 'package:path/path.dart' as p;

import 'speech_fixtures.dart';

void main() {
  // The service follows the app's lifecycle, and speech keeps the screen on, through the binding.
  TestWidgetsFlutterBinding.ensureInitialized();

  group('appendTranscript', () {
    test('an empty note takes the transcript as its text', () {
      expect(appendTranscript('', 'ሰላም።'), 'ሰላም።');
      expect(appendTranscript('  \n ', 'ሰላም።'), 'ሰላም።');
    });

    test('a note with text gets the transcript after a blank line', () {
      expect(appendTranscript('ርዕስ', 'ሰላም።'), 'ርዕስ\n\nሰላም።');
      expect(appendTranscript('ርዕስ\n\n', 'ሰላም።'), 'ርዕስ\n\nሰላም።');
    });
  });

  group('SpeechService', speechServiceTests);
}

void speechServiceTests() {
  late Directory root;
  late NotesStore notes;
  late ModelStore models;
  late FakeLoader loader;
  late SpeechService speech;
  final now = DateTime.utc(2026, 11, 2, 9, 41);
  final en = SpeechMessages.en;

  Future<void> setUpWith({bool ready = true, Duration releaseAfter = const Duration(minutes: 5)}) async {
    notes = await notesStoreIn(Directory(p.join(root.path, 'notes')));
    models = await fakeModelStore(Directory(p.join(root.path, 'models')), ready: ready);
    loader = FakeLoader();
    speech = SpeechService(models: models, notes: notes, loader: loader, releaseAfter: releaseAfter, clock: () => now);
  }

  setUp(() async {
    root = await Directory.systemTemp.createTemp('nota_speech_');
  });

  tearDown(() async {
    speech.dispose();
    notes.dispose();
    models.dispose();
    await root.delete(recursive: true);
  });

  Future<Note> transcribed(String id) async {
    await waitFor(() => !speech.isTranscribing(id));
    return notes.byId(id)!;
  }

  group('transcribeNote', () {
    test('puts the punctuated transcript into an empty note', () async {
      await setUpWith();
      final note = await addVoiceNote(notes);
      final replaced = notes.textReplaced.first;
      speech.transcribeNote(note.id);
      expect(speech.isTranscribing(note.id), isTrue);
      final done = await transcribed(note.id);
      expect(done.text, 'ሰላም ዓለም።');
      final transcription = done.audio!.transcription;
      expect(transcription, isA<TranscriptionDone>());
      expect((transcription as TranscriptionDone).model, hoheModel);
      expect(transcription.transcribedAt, now);
      expect(await replaced, note.id);
      expect(speech.progress(note.id), isNull);
    });

    test('adds the transcript after the text a note already has', () async {
      await setUpWith();
      final note = await addVoiceNote(notes, text: 'Meeting');
      speech.transcribeNote(note.id);
      expect((await transcribed(note.id)).text, 'Meeting\n\nሰላም ዓለም።');
    });

    test('keeps the words when the punctuation model fails', () async {
      await setUpWith();
      loader.failPunctuation = true;
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      expect((await transcribed(note.id)).text, 'ሰላም ዓለም');
      expect(loader.punctuatorReleases, 1);
    });

    test('says the model is missing when its files are not there', () async {
      await setUpWith(ready: false);
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      final failed = (await transcribed(note.id)).audio!.transcription;
      expect(failed, isA<TranscriptionFailed>());
      expect((failed as TranscriptionFailed).message, en.noModel);
      expect(loader.recognizerLoads, 0);
    });

    test('says Hohe could not start when it fails to load', () async {
      await setUpWith();
      loader.failLoad = true;
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      final failed = (await transcribed(note.id)).audio!.transcription as TranscriptionFailed;
      expect(failed.message, en.cantStart);
    });

    test('keeps a generic failure, releases the model, and loads it again next time', () async {
      await setUpWith();
      loader.failRun = true;
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      final failed = (await transcribed(note.id)).audio!.transcription as TranscriptionFailed;
      expect(failed.message, en.failed);
      expect(failed.message, isNot(contains('INFERENCE_ERROR')));
      await waitFor(() => loader.recognizerReleases == 1);
      expect(speech.isModelLoaded, isFalse);

      loader.failRun = false;
      speech.transcribeNote(note.id);
      expect((await transcribed(note.id)).audio!.transcription, isA<TranscriptionDone>());
      expect(loader.recognizerLoads, 2);
    });

    test('keeps a generic failure when the model breaks in an unexpected way', () async {
      await setUpWith();
      loader.reply = (_, _) => throw StateError('secret words');
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      final failed = (await transcribed(note.id)).audio!.transcription as TranscriptionFailed;
      expect(failed.message, en.failed);
      final clip = await speech.transcribeClip(Int16List(sampleRate));
      expect((clip as Err<String>).message, en.clipFailed);
    });

    test('says nothing was heard when Hohe returns no words', () async {
      await setUpWith();
      loader.reply = (_, _) => '  ';
      final note = await addVoiceNote(notes, text: 'kept');
      speech.transcribeNote(note.id);
      final done = await transcribed(note.id);
      expect((done.audio!.transcription as TranscriptionFailed).message, en.nothingHeard);
      expect(done.text, 'kept');
    });

    test('fails when the recording is missing', () async {
      await setUpWith();
      final note = await addVoiceNote(notes, withWav: false);
      speech.transcribeNote(note.id);
      expect(((await transcribed(note.id)).audio!.transcription as TranscriptionFailed).message, en.failed);
    });

    test('lets a note deleted while waiting go', () async {
      await setUpWith();
      loader.gate = Completer<void>();
      final first = await addVoiceNote(notes);
      final second = await addVoiceNote(notes);
      speech
        ..transcribeNote(first.id)
        ..transcribeNote(second.id);
      await waitFor(() => loader.calls.length == 1);
      await notes.deleteForever(second.id);
      loader.gate!.complete();
      await waitFor(() => !speech.isTranscribing(second.id) && !speech.isTranscribing(first.id));
      expect(notes.byId(second.id), isNull);
      expect(loader.calls, hasLength(1));
    });

    test('ignores a note already queued', () async {
      await setUpWith();
      loader.gate = Completer<void>();
      final note = await addVoiceNote(notes);
      speech
        ..transcribeNote(note.id)
        ..transcribeNote(note.id);
      loader.gate!.complete();
      await transcribed(note.id);
      expect(loader.calls, hasLength(1));
    });
  });

  group('after a restart', () {
    /// Opens the stores over what the last run left, then the service.
    Future<void> restart({bool ready = true}) async {
      notes.dispose();
      models.dispose();
      speech.dispose();
      notes = await notesStoreIn(Directory(p.join(root.path, 'notes')));
      models = await fakeModelStore(Directory(p.join(root.path, 'models')), ready: ready);
      speech = SpeechService(models: models, notes: notes, loader: loader, clock: () => now);
    }

    test('queues the recordings still waiting to be transcribed', () async {
      await setUpWith();
      final older = await addVoiceNote(notes, samples: sampleRate * 2);
      final newer = await addVoiceNote(notes);
      await restart();
      await waitFor(() => notes.byId(newer.id)!.audio!.transcription is TranscriptionDone);
      await waitFor(() => notes.byId(older.id)!.audio!.transcription is TranscriptionDone);
      // The job ends once its note is saved: tearDown deletes the folder.
      await waitFor(() => !speech.isTranscribing(older.id));
      expect(notes.byId(older.id)!.text, 'ሰላም ዓለም።');
      expect(loader.calls, [sampleRate * 2, sampleRate], reason: 'oldest first');
    });

    test('leaves alone a recording without its file, or one whose note has text', () async {
      await setUpWith();
      final missing = await addVoiceNote(notes, withWav: false);
      final typed = await addVoiceNote(notes, text: 'dictated, with a gap');
      await restart();
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(loader.calls, isEmpty);
      expect(notes.byId(missing.id)!.audio!.transcription, isA<TranscriptionPending>());
      expect(notes.byId(typed.id)!.audio!.transcription, isA<TranscriptionPending>());
    });

    test('marks the recording that was running when the app closed, instead of running it again', () async {
      await setUpWith();
      loader.gate = Completer<void>();
      final running = await addVoiceNote(notes);
      final waiting = await addVoiceNote(notes);
      speech
        ..transcribeNote(running.id)
        ..transcribeNote(waiting.id);
      await waitFor(() => loader.calls.length == 1);
      // The app is killed here: the jobs never finish.
      loader
        ..gate = null
        ..calls.clear();
      await restart();
      await waitFor(() => notes.byId(waiting.id)!.audio!.transcription is TranscriptionDone);
      // The job ends once its note is saved and the marker removed: tearDown deletes the folder.
      await waitFor(() => !speech.isTranscribing(waiting.id));
      final interrupted = notes.byId(running.id)!.audio!.transcription;
      expect(interrupted, isA<TranscriptionFailed>());
      expect((interrupted as TranscriptionFailed).message, en.interrupted);
      expect(loader.calls, hasLength(1));
    });

    test('waits for the model files, then queues them', () async {
      await setUpWith(ready: false);
      final note = await addVoiceNote(notes);
      await restart(ready: false);
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(notes.byId(note.id)!.audio!.transcription, isA<TranscriptionPending>());
      await writeFakeModels(Directory(models.directory));
      await models.refresh();
      await waitFor(() => notes.byId(note.id)!.audio!.transcription is TranscriptionDone);
    });
  });

  group('prepare', () {
    test('loads Hohe ahead of the first clip, once', () async {
      await setUpWith();
      speech
        ..prepare()
        ..prepare();
      final clip = speech.transcribeClip(Int16List(sampleRate));
      expect(await clip, isA<Ok<String>>());
      expect(loader.recognizerLoads, 1);
    });

    test('does nothing without the model files', () async {
      await setUpWith(ready: false);
      speech.prepare();
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(loader.recognizerLoads, 0);
    });

    test('lets the model go again when no clip comes', () async {
      await setUpWith(releaseAfter: const Duration(milliseconds: 30));
      speech.prepare();
      await waitFor(() => speech.isModelLoaded);
      await waitFor(() => loader.recognizerReleases == 1);
      expect(speech.isModelLoaded, isFalse);
    });
  });

  group('the queue', () {
    test('runs one job at a time; clips go ahead of waiting recordings', () async {
      await setUpWith();
      loader
        ..gate = Completer<void>()
        ..reply = (call, _) => 'ቃል$call';
      final first = await addVoiceNote(notes, samples: sampleRate);
      final second = await addVoiceNote(notes, samples: sampleRate * 2);
      speech
        ..transcribeNote(first.id)
        ..transcribeNote(second.id);
      await waitFor(() => loader.calls.length == 1);

      expect(speech.isTranscribing(first.id), isTrue);
      expect(speech.isTranscribing(second.id), isTrue);
      expect(speech.progress(first.id), 0);
      expect(speech.progress(second.id), isNull);

      final clip = speech.transcribeClip(Int16List(sampleRate ~/ 2));
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(loader.calls, hasLength(1), reason: 'the clip waits for the recording running');

      loader.gate!.complete();
      final clipText = await clip;
      expect(clipText, isA<Ok<String>>());
      expect((clipText as Ok<String>).value, 'ቃል1', reason: 'clips are not punctuated');
      await transcribed(second.id);
      expect(loader.calls, [sampleRate, sampleRate ~/ 2, sampleRate * 2]);
      expect(notes.byId(first.id)!.text, 'ቃል0።');
      expect(notes.byId(second.id)!.text, 'ቃል2።');
    });

    test('reports progress while the recording runs', () async {
      await setUpWith();
      loader.gate = Completer<void>();
      final note = await addVoiceNote(notes);
      final seen = <double?>[];
      speech
        ..addListener(() => seen.add(speech.progress(note.id)))
        ..transcribeNote(note.id);
      await waitFor(() => loader.calls.length == 1);
      loader.gate!.complete();
      await transcribed(note.id);
      expect(seen, containsAllInOrder(<double>[0, 0.45, 0.9, 1]));
    });

    test('a clip fails with a message when the model is missing', () async {
      await setUpWith(ready: false);
      final result = await speech.transcribeClip(Int16List(sampleRate));
      expect(result, isA<Err<String>>());
      expect((result as Err<String>).message, en.noModel);
    });

    test('a clip that fails says so without the error text', () async {
      await setUpWith();
      loader.failRun = true;
      final result = await speech.transcribeClip(Int16List(sampleRate));
      expect((result as Err<String>).message, en.clipFailed);
    });

    test('releases the models a while after their last use', () async {
      await setUpWith(releaseAfter: const Duration(milliseconds: 50));
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      await transcribed(note.id);
      expect(speech.isModelLoaded, isTrue);
      await waitFor(() => loader.recognizerReleases == 1 && loader.punctuatorReleases == 1);
      expect(speech.isModelLoaded, isFalse);

      await speech.transcribeClip(Int16List(sampleRate));
      expect(loader.recognizerLoads, 2);
    });

    test('releases the models when their files are deleted', () async {
      await setUpWith();
      await speech.transcribeClip(Int16List(sampleRate));
      await waitFor(() => !speech.isLoadingModel);
      expect(speech.isModelLoaded, isTrue);
      await models.delete();
      await waitFor(() => loader.recognizerReleases == 1);
      expect(speech.isModelLoaded, isFalse);
    });

    test('dispose answers clips still waiting', () async {
      await setUpWith();
      loader.gate = Completer<void>();
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      await waitFor(() => loader.calls.length == 1);
      final waiting = speech.transcribeClip(Int16List(sampleRate));
      speech.dispose();
      expect(await waiting, isA<Err<String>>());
      loader.gate!.complete();
      // tearDown disposes again: make that a fresh service.
      speech = SpeechService(models: models, notes: notes, loader: loader);
    });
  });
}
