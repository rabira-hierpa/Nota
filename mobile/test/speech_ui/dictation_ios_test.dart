import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/core/device.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/speech/audio/recorder.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/dictation_controller.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:path/path.dart' as p;
import 'package:record/record.dart' show RecordState;

import 'speech_fixtures.dart';

/// A microphone the test feeds, whose state the test changes as the system
/// would for a call or Siri.
final class _FakeMic implements Recorder {
  final samples = StreamController<Int16List>();
  final stateChanges = StreamController<RecordState>.broadcast();
  bool permission = true;
  bool stopped = false;
  bool disposed = false;

  @override
  Future<bool> hasPermission() async => permission;

  @override
  Future<Result<void>> startFile(String path) async => const Ok(null);

  @override
  Future<Result<Stream<Int16List>>> startStream() async =>
      permission ? Ok(samples.stream) : const Err(RecorderError.permissionDenied);

  @override
  Stream<double> levels() => const Stream.empty();

  @override
  Stream<RecordState> states() => stateChanges.stream;

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
  Future<void> dispose() async {
    disposed = true;
    await stateChanges.close();
  }
}

/// Feeds [audio] to [mic] in 100 ms chunks, as a microphone would.
Future<void> _feed(_FakeMic mic, Int16List audio) async {
  const chunk = sampleRate ~/ 10;
  for (var start = 0; start < audio.length; start += chunk) {
    final end = start + chunk < audio.length ? start + chunk : audio.length;
    mic.samples.add(Int16List.sublistView(audio, start, end));
    await Future<void>.delayed(Duration.zero);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const device = MethodChannel('nota/device');

  late Directory root;
  late NotesStore notes;
  late ModelStore models;
  late FakeLoader loader;
  late SpeechService speech;
  late _FakeMic mic;
  late TextEditingValue typed;

  /// What was asked of the phone, as `method:argument`.
  late List<String> deviceCalls;
  final now = DateTime.utc(2026, 11, 2, 9, 41);

  /// Two stretches of speech, each followed by a pause long enough to end a clip.
  final twoPhrases = Int16List.fromList([...tone(600), ...silence(700), ...tone(600), ...silence(700)]);

  setUp(() async {
    root = await Directory.systemTemp.createTemp('nota_dictation_ios_');
    notes = await notesStoreIn(Directory(p.join(root.path, 'notes')));
    models = await fakeModelStore(Directory(p.join(root.path, 'models')));
    loader = FakeLoader()..reply = (call, _) => ['አንድ', 'ሁለት', 'ሦስት'][call];
    speech = SpeechService(models: models, notes: notes, loader: loader, clock: () => now);
    mic = _FakeMic();
    deviceCalls = [];
    Device.reset();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(device, (call) async {
      deviceCalls.add('${call.method}:${call.arguments}');
      return null;
    });
  });

  tearDown(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(device, null);
    speech.dispose();
    notes.dispose();
    models.dispose();
    await root.delete(recursive: true);
  });

  DictationController controllerFor(Note note, {Duration stallAfter = const Duration(seconds: 30)}) {
    typed = TextEditingValue(
      text: note.text,
      selection: TextSelection.collapsed(offset: note.text.length),
    );
    return DictationController(
      noteId: note.id,
      speech: speech,
      notes: notes,
      insert: (text) => typed = insertDictated(typed, text),
      recorder: () => mic,
      clock: () => now,
      stallAfter: stallAfter,
    );
  }

  group('a microphone taken away', () {
    for (final state in [RecordState.pause, RecordState.stop]) {
      test('(the recorder reports ${state.name}) stops dictation, keeping the audio and the words', () async {
        final note = await notes.create();
        final dictation = controllerFor(note);
        await dictation.start();
        await _feed(mic, twoPhrases);
        mic.stateChanges.add(state);
        await waitFor(() => dictation.phase == DictationPhase.idle);

        expect(dictation.error, RecorderError.interrupted);
        expect(mic.stopped, isTrue);
        expect(mic.disposed, isTrue);
        expect(typed.text, 'አንድ ሁለት');
        final audio = notes.byId(note.id)!.audio!;
        expect(audio.durationMs, twoPhrases.length * 1000 ~/ sampleRate);
        expect(audio.transcription, isA<TranscriptionDone>());
        expect(readWav(await File(notes.audioPath(note.id)).readAsBytes()).valueOrNull, twoPhrases);
      });
    }

    test('a recorder saying it records again is no interruption', () async {
      final note = await notes.create();
      final dictation = controllerFor(note);
      await dictation.start();
      mic.stateChanges.add(RecordState.record);
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(dictation.phase, DictationPhase.listening);
      await dictation.stop();
      expect(dictation.error, isNull);
    });

    test('the stop asked for is not taken for an interruption', () async {
      final note = await notes.create();
      final dictation = controllerFor(note);
      await dictation.start();
      await _feed(mic, twoPhrases);
      await dictation.stop();
      expect(dictation.error, isNull);
    });
  });

  group('the watchdog', () {
    test('stops dictation when no audio has come for a while, keeping what was heard', () async {
      final note = await notes.create();
      final dictation = controllerFor(note, stallAfter: const Duration(milliseconds: 100));
      await dictation.start();
      await _feed(mic, twoPhrases);
      // The stream goes quiet, as iOS's does during a call: no samples, no state.
      await waitFor(() => dictation.phase == DictationPhase.idle);

      expect(dictation.error, RecorderError.interrupted);
      expect(mic.stopped, isTrue);
      expect(typed.text, 'አንድ ሁለት');
      expect(notes.byId(note.id)!.audio!.transcription, isA<TranscriptionDone>());
    });

    test('keeps listening while samples come, however quiet', () async {
      final note = await notes.create();
      final dictation = controllerFor(note, stallAfter: const Duration(milliseconds: 150));
      await dictation.start();
      for (var i = 0; i < 12; i++) {
        mic.samples.add(silence(100));
        await Future<void>.delayed(const Duration(milliseconds: 20));
      }
      expect(dictation.phase, DictationPhase.listening);
      await dictation.stop();
      expect(dictation.error, RecorderError.silent);
    });

    test('a stopped dictation leaves none behind to stop the next one', () async {
      final note = await notes.create();
      final mics = [_FakeMic(), _FakeMic()];
      var started = 0;
      final dictation = DictationController(
        noteId: note.id,
        speech: speech,
        notes: notes,
        insert: (_) {},
        recorder: () => mics[started++],
        stallAfter: const Duration(milliseconds: 150),
      );
      await dictation.start();
      await _feed(mics.first, tone(300));
      await dictation.stop();

      await dictation.start();
      // Chunks closer together than the limit, past when the first session's would have fired.
      for (var i = 0; i < 8; i++) {
        mics.last.samples.add(Int16List(sampleRate ~/ 20));
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }
      expect(dictation.error, isNull);
      expect(dictation.phase, DictationPhase.listening);
      await dictation.stop();
      dictation.dispose();
    });
  });

  group('on Stop', () {
    test('the recording is on disk and with the note before the last clips are typed', () async {
      final note = await notes.create(text: 'Notes:');
      final dictation = controllerFor(note);
      loader.gate = Completer<void>();
      await dictation.start();
      await _feed(mic, twoPhrases);
      await waitFor(() => loader.calls.length == 1);
      final stopped = dictation.stop();
      await waitFor(() => notes.byId(note.id)!.audio != null);

      // Nota could be ended here: the text has a gap, so the recording waits to be transcribed whole.
      expect(dictation.phase, DictationPhase.finishing);
      expect(dictation.pendingClips, greaterThan(0));
      expect(typed.text, 'Notes:');
      expect(notes.byId(note.id)!.audio!.transcription, isA<TranscriptionPending>());
      expect(readWav(await File(notes.audioPath(note.id)).readAsBytes()).valueOrNull, twoPhrases);

      loader.gate!.complete();
      await stopped;
      expect(typed.text, 'Notes: አንድ ሁለት');
      final audio = notes.byId(note.id)!.audio!;
      expect(audio.durationMs, twoPhrases.length * 1000 ~/ sampleRate);
      expect(audio.transcription, isA<TranscriptionDone>());
      expect((audio.transcription as TranscriptionDone).transcribedAt, now);
    });

    test('a recording queued for transcription meanwhile is left to it', () async {
      final note = await notes.create();
      final dictation = controllerFor(note);
      loader.gate = Completer<void>();
      await dictation.start();
      await _feed(mic, twoPhrases);
      await waitFor(() => loader.calls.length == 1);
      final stopped = dictation.stop();
      await waitFor(() => notes.byId(note.id)!.audio != null);
      speech.transcribeNote(note.id);
      loader.gate!.complete();
      await stopped;
      expect(speech.isTranscribing(note.id), isTrue);
      await waitFor(() => !speech.isTranscribing(note.id));
      expect(notes.byId(note.id)!.audio!.transcription, isA<TranscriptionDone>());
    });
  });

  group('the speech service', () {
    test('knows the note is dictated into until its last words are typed', () async {
      final note = await notes.create();
      final dictation = controllerFor(note);
      loader.gate = Completer<void>();
      await dictation.start();
      expect(speech.isDictating(note.id), isTrue);
      await _feed(mic, twoPhrases);
      await waitFor(() => loader.calls.length == 1);
      final stopped = dictation.stop();
      await waitFor(() => notes.byId(note.id)!.audio != null);
      expect(dictation.pendingClips, greaterThan(0));
      expect(speech.isDictating(note.id), isTrue, reason: 'words are still on their way');

      loader.gate!.complete();
      await stopped;
      expect(typed.text, 'አንድ ሁለት');
      expect(speech.isDictating(note.id), isFalse);
      dictation.dispose();
    });

    test('forgets a dictation whose microphone failed to start', () async {
      final note = await notes.create();
      mic.permission = false;
      final dictation = controllerFor(note);
      await dictation.start();
      expect(speech.isDictating(note.id), isFalse);
      dictation.dispose();
    });
  });

  group('the screen and the audio session', () {
    test('the screen stays on while listening, and the audio is handed back after', () async {
      final note = await notes.create();
      final dictation = controllerFor(note);
      await dictation.start();
      expect(deviceCalls, ['keepScreenOn:true']);
      await _feed(mic, twoPhrases);
      await dictation.stop();
      expect(deviceCalls, ['keepScreenOn:true', 'keepScreenOn:false', 'releaseAudio:null']);
      dictation.dispose();
      expect(deviceCalls, hasLength(3));
    });

    test('an interruption lets the screen lock and hands the audio back', () async {
      final note = await notes.create();
      final dictation = controllerFor(note);
      await dictation.start();
      mic.stateChanges.add(RecordState.pause);
      await waitFor(() => dictation.phase == DictationPhase.idle);
      expect(deviceCalls, ['keepScreenOn:true', 'keepScreenOn:false', 'releaseAudio:null']);
    });

    test('a microphone that fails to start hands the audio back and leaves the screen alone', () async {
      final note = await notes.create();
      mic.permission = false;
      final dictation = controllerFor(note);
      await dictation.start();
      expect(dictation.error, RecorderError.permissionDenied);
      await waitFor(() => deviceCalls.isNotEmpty);
      expect(deviceCalls, ['releaseAudio:null']);
    });

    test('the audio is handed back only once a recording playing alongside has stopped too', () async {
      final player = Object();
      await Device.useAudio(player, true);
      final note = await notes.create();
      final dictation = controllerFor(note);
      await dictation.start();
      await _feed(mic, twoPhrases);
      await dictation.stop();
      expect(deviceCalls, ['keepScreenOn:true', 'keepScreenOn:false']);

      await Device.useAudio(player, false);
      expect(deviceCalls.last, 'releaseAudio:null');
      dictation.dispose();
    });

    test('closing the note while listening lets the screen lock at once', () async {
      final note = await notes.create();
      final dictation = controllerFor(note);
      await dictation.start();
      dictation.dispose();
      expect(deviceCalls, ['keepScreenOn:true', 'keepScreenOn:false']);
      await waitFor(() => mic.disposed);
      await waitFor(() => deviceCalls.length == 3);
      expect(deviceCalls.last, 'releaseAudio:null');
    });
  });
}
