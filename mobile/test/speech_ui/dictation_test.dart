import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/speech/audio/recorder.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/dictation_controller.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:nota/l10n/speech_messages.dart';
import 'package:path/path.dart' as p;

import 'speech_fixtures.dart';

TextEditingValue at(String text, int offset) => TextEditingValue(
  text: text,
  selection: TextSelection.collapsed(offset: offset),
);

void main() {
  // The service follows the app's lifecycle, and speech keeps the screen on, through the binding.
  TestWidgetsFlutterBinding.ensureInitialized();

  group('insertDictated', () {
    test('types into an empty note', () {
      final value = insertDictated(TextEditingValue.empty, 'ሰላም');
      expect(value.text, 'ሰላም');
      expect(value.selection, const TextSelection.collapsed(offset: 3));
    });

    test('keeps a space from the word before the cursor', () {
      expect(insertDictated(at('Hello', 5), 'ሰላም').text, 'Hello ሰላም');
      expect(insertDictated(at('Hello ', 6), 'ሰላም').text, 'Hello ሰላም');
      expect(insertDictated(at('Hello\n', 6), 'ሰላም').text, 'Hello\nሰላም');
    });

    test('keeps a space from the word after the cursor, and leaves the cursor after the text', () {
      final value = insertDictated(at('abcd', 2), 'ሰላም');
      expect(value.text, 'ab ሰላም cd');
      expect(value.selection.baseOffset, 6);
    });

    test('replaces a selection', () {
      final value = insertDictated(
        const TextEditingValue(text: 'Hello world', selection: TextSelection(baseOffset: 6, extentOffset: 11)),
        'ሰላም',
      );
      expect(value.text, 'Hello ሰላም');
    });

    test('goes to the end when there is no cursor', () {
      expect(insertDictated(const TextEditingValue(text: 'Hello'), 'ሰላም').text, 'Hello ሰላም');
    });
  });

  group('DictationController', dictationTests);
}

void dictationTests() {
  late Directory root;
  late NotesStore notes;
  late ModelStore models;
  late FakeLoader loader;
  late SpeechService speech;
  late FakeRecorder recorder;
  late TextEditingValue typed;
  final now = DateTime.utc(2026, 11, 2, 9, 41);

  /// Two stretches of speech, each followed by a pause long enough to end a clip.
  final twoPhrases = Int16List.fromList([...tone(600), ...silence(700), ...tone(600), ...silence(700)]);

  setUp(() async {
    root = await Directory.systemTemp.createTemp('nota_dictation_');
    notes = await notesStoreIn(Directory(p.join(root.path, 'notes')));
    models = await fakeModelStore(Directory(p.join(root.path, 'models')));
    loader = FakeLoader()..reply = (call, _) => ['አንድ', 'ሁለት', 'ሦስት'][call];
    speech = SpeechService(models: models, notes: notes, loader: loader, clock: () => now);
    recorder = FakeRecorder();
  });

  tearDown(() async {
    speech.dispose();
    notes.dispose();
    models.dispose();
    await root.delete(recursive: true);
  });

  DictationController controllerFor(Note note) {
    typed = TextEditingValue(
      text: note.text,
      selection: TextSelection.collapsed(offset: note.text.length),
    );
    return DictationController(
      noteId: note.id,
      speech: speech,
      notes: notes,
      insert: (text) => typed = insertDictated(typed, text),
      recorder: () => recorder,
      clock: () => now,
    );
  }

  test('types each phrase in order, then keeps the audio with the note', () async {
    final note = await notes.create(text: 'Notes:');
    final dictation = controllerFor(note);
    await dictation.start();
    expect(dictation.phase, DictationPhase.listening);
    await feed(recorder, twoPhrases);
    await dictation.stop();

    expect(typed.text, 'Notes: አንድ ሁለት');
    expect(loader.calls, hasLength(2));
    expect(dictation.phase, DictationPhase.idle);
    expect(dictation.pendingClips, 0);
    expect(recorder.stopped, isTrue);
    expect(recorder.disposed, isTrue);

    final audio = notes.byId(note.id)!.audio!;
    expect(audio.durationMs, twoPhrases.length * 1000 ~/ sampleRate);
    expect(audio.transcription, isA<TranscriptionDone>());
    final wav = readWav(await File(notes.audioPath(note.id)).readAsBytes()).valueOrNull!;
    expect(wav, twoPhrases);
  });

  test('transcribes the last phrase when stopped mid-sentence', () async {
    final note = await notes.create();
    final dictation = controllerFor(note);
    await dictation.start();
    await feed(recorder, tone(800));
    await dictation.stop();
    expect(typed.text, 'አንድ');
  });

  test('leaves a recording to be transcribed whole when a clip failed', () async {
    final note = await notes.create();
    final dictation = controllerFor(note);
    loader.failRun = true;
    final errors = <String?>[];
    dictation.addListener(() => errors.add(dictation.error));
    await dictation.start();
    await feed(recorder, twoPhrases);
    await dictation.stop();
    expect(errors, contains(SpeechMessages.en.clipFailed));
    expect(notes.byId(note.id)!.audio!.transcription, isA<TranscriptionPending>());
  });

  test('does not replace a recording the note already has', () async {
    final note = await addVoiceNote(notes, samples: 4000);
    final dictation = controllerFor(note);
    await dictation.start();
    await feed(recorder, twoPhrases);
    await dictation.stop();
    expect(notes.byId(note.id)!.audio!.durationMs, 250);
    expect(readWav(await File(notes.audioPath(note.id)).readAsBytes()).valueOrNull, hasLength(4000));
  });

  test('keeps no audio from a silent microphone, and says so', () async {
    final note = await notes.create();
    final dictation = controllerFor(note);
    await dictation.start();
    await feed(recorder, silence(1500));
    await dictation.stop();
    expect(dictation.error, RecorderError.silent);
    expect(notes.byId(note.id)!.audio, isNull);
    expect(loader.calls, isEmpty);
  });

  test('reports a refused microphone and stays idle', () async {
    final note = await notes.create();
    recorder.permission = false;
    final dictation = controllerFor(note);
    await dictation.start();
    expect(dictation.phase, DictationPhase.idle);
    expect(dictation.error, RecorderError.permissionDenied);
  });

  test('keeps the samples that arrive after Stop, up to the end of the stream', () async {
    final note = await notes.create();
    final dictation = controllerFor(note);
    await dictation.start();
    // Delivered only after stop() begins, as a microphone's last buffers are.
    final audio = tone(800);
    for (var start = 0; start < audio.length; start += sampleRate ~/ 10) {
      recorder.samples.add(Int16List.sublistView(audio, start, start + sampleRate ~/ 10));
    }
    await dictation.stop();
    expect(typed.text, 'አንድ');
    expect(notes.byId(note.id)!.audio!.durationMs, 800);
  });

  test('loads the speech model as soon as the microphone starts', () async {
    final note = await notes.create();
    final dictation = controllerFor(note);
    await dictation.start();
    await waitFor(() => speech.isModelLoaded);
    expect(loader.recognizerLoads, 1);
    expect(loader.calls, isEmpty);
    await dictation.stop();
    expect(loader.recognizerLoads, 1, reason: 'the clips use the model loaded ahead');
  });

  test('sends each clip at once, so a recording queued meanwhile waits for the dictation', () async {
    final note = await notes.create();
    final voiceNote = await addVoiceNote(notes);
    final dictation = controllerFor(note);
    loader.gate = Completer<void>();
    await dictation.start();
    await feed(recorder, Int16List.fromList([...tone(600), ...silence(700)]));
    await waitFor(() => loader.calls.length == 1);
    speech.transcribeNote(voiceNote.id);
    await feed(recorder, Int16List.fromList([...tone(900), ...silence(700)]));
    loader.gate!.complete();
    await dictation.stop();
    await waitFor(() => !speech.isTranscribing(voiceNote.id));
    final clip = sampleRate * 600 ~/ 1000;
    expect(loader.calls.first, greaterThanOrEqualTo(clip));
    expect(loader.calls[1], greaterThan(loader.calls.first), reason: 'the second clip runs before the recording');
    expect(loader.calls.last, sampleRate);
    expect(typed.text, 'አንድ ሁለት');
  });

  test('sends what is still coming to the note once the editor is gone', () async {
    final note = await notes.create(text: 'Before');
    final dictation = controllerFor(note);
    loader.gate = Completer<void>();
    await dictation.start();
    await feed(recorder, Int16List.fromList([...tone(600), ...silence(700)]));
    await waitFor(() => loader.calls.length == 1);
    dictation.detach();
    loader.gate!.complete();
    await waitFor(() => dictation.phase == DictationPhase.idle);
    expect(typed.text, 'Before');
    expect(notes.byId(note.id)!.text, 'Before አንድ');
  });
}
