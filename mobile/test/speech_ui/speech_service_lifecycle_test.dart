import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/core/device.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/speech/audio/wav.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:path/path.dart' as p;

import 'speech_fixtures.dart';

void main() {
  final binding = TestWidgetsFlutterBinding.ensureInitialized();
  const device = MethodChannel('nota/device');

  late Directory root;
  late NotesStore notes;
  late ModelStore models;
  late FakeLoader loader;
  late SpeechService speech;
  late List<String> deviceCalls;
  var inBackground = false;

  /// The app leaving the screen, through the states iOS and Android pass.
  void toBackground() {
    for (final state in [AppLifecycleState.inactive, AppLifecycleState.hidden, AppLifecycleState.paused]) {
      binding.handleAppLifecycleStateChanged(state);
    }
    inBackground = true;
  }

  void toForeground() {
    for (final state in [AppLifecycleState.hidden, AppLifecycleState.inactive, AppLifecycleState.resumed]) {
      binding.handleAppLifecycleStateChanged(state);
    }
    inBackground = false;
  }

  setUp(() async {
    root = await Directory.systemTemp.createTemp('nota_speech_lifecycle_');
    notes = await notesStoreIn(Directory(p.join(root.path, 'notes')));
    models = await fakeModelStore(Directory(p.join(root.path, 'models')));
    loader = FakeLoader();
    speech = SpeechService(models: models, notes: notes, loader: loader);
    deviceCalls = [];
    Device.reset();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(device, (call) async {
      deviceCalls.add('${call.method}:${call.arguments}');
      return null;
    });
  });

  tearDown(() async {
    if (inBackground) toForeground();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(device, null);
    speech.dispose();
    notes.dispose();
    models.dispose();
    await root.delete(recursive: true);
  });

  group('in the background', () {
    test('the models are let go at once when nothing runs', () async {
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      await waitFor(() => !speech.isTranscribing(note.id));
      expect(speech.isModelLoaded, isTrue, reason: 'in the foreground they stay a while');

      toBackground();
      await waitFor(() => loader.recognizerReleases == 1 && loader.punctuatorReleases == 1);
      expect(speech.isModelLoaded, isFalse);
    });

    test('a recording being transcribed keeps them until it is done', () async {
      loader.gate = Completer<void>();
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      await waitFor(() => loader.calls.length == 1);

      toBackground();
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(loader.recognizerReleases, 0);
      expect(speech.isModelLoaded, isTrue);

      loader.gate!.complete();
      await waitFor(() => !speech.isTranscribing(note.id));
      expect(notes.byId(note.id)!.text, 'ሰላም ዓለም።');
      await waitFor(() => loader.recognizerReleases == 1 && loader.punctuatorReleases == 1);
      expect(speech.isModelLoaded, isFalse);
    });

    test('a dictation clip on its way keeps them until it is typed', () async {
      loader.gate = Completer<void>();
      final clip = speech.transcribeClip(Int16List(sampleRate));
      await waitFor(() => loader.calls.length == 1);

      toBackground();
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(loader.recognizerReleases, 0);

      loader.gate!.complete();
      expect(await clip, isA<Ok<String>>());
      await waitFor(() => loader.recognizerReleases == 1);
      expect(speech.isModelLoaded, isFalse);
    });

    test('a dictation keeps them between its clips, until its last words are typed', () async {
      final owner = Object();
      speech.dictating(owner, 'note', true);
      expect(await speech.transcribeClip(Int16List(sampleRate)), isA<Ok<String>>());

      // Put away mid-sentence: the last clip comes as dictation stops.
      toBackground();
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(loader.recognizerReleases, 0);
      expect(await speech.transcribeClip(Int16List(sampleRate)), isA<Ok<String>>());
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(loader.recognizerLoads, 1, reason: 'not let go and loaded again for the last clip');
      expect(loader.recognizerReleases, 0);

      speech.dictating(owner, 'note', false);
      await waitFor(() => loader.recognizerReleases == 1);
      expect(speech.isModelLoaded, isFalse);
    });

    test('a recording queued there waits for Nota to come back', () async {
      toBackground();
      final note = await addVoiceNote(notes);
      speech.transcribeNote(note.id);
      expect(await speech.transcribeClip(Int16List(sampleRate)), isA<Ok<String>>(), reason: 'dictation still runs');
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(loader.calls, hasLength(1), reason: 'only the clip ran');
      expect(speech.isTranscribing(note.id), isTrue);
      expect(speech.isModelLoaded, isFalse, reason: 'let go while the recording waits');

      toForeground();
      await waitFor(() => !speech.isTranscribing(note.id));
      expect(notes.byId(note.id)!.text, 'ሰላም ዓለም።');
    });

    test('a model loaded ahead is let go once it has loaded', () async {
      toBackground();
      speech.prepare();
      await waitFor(() => loader.recognizerLoads == 1);
      await waitFor(() => loader.recognizerReleases == 1);
      expect(speech.isModelLoaded, isFalse);
    });
  });

  test('a dictation is known by its note until it ends, and says so', () async {
    final owner = Object();
    var changes = 0;
    speech.addListener(() => changes++);
    speech.dictating(owner, 'note', true);
    speech.dictating(owner, 'note', true);
    expect(speech.isDictating('note'), isTrue);
    expect(speech.isDictating('other'), isFalse);
    expect(changes, 1);
    speech.dictating(owner, 'note', false);
    speech.dictating(owner, 'note', false);
    expect(speech.isDictating('note'), isFalse);
    expect(changes, 2);
  });

  test('in the foreground a dictation keeps the models past the usual wait', () async {
    speech.dispose();
    speech = SpeechService(
      models: models,
      notes: notes,
      loader: loader,
      releaseAfter: const Duration(milliseconds: 20),
    );
    final owner = Object();
    speech.dictating(owner, 'note', true);
    expect(await speech.transcribeClip(Int16List(sampleRate)), isA<Ok<String>>());
    await Future<void>.delayed(const Duration(milliseconds: 60));
    expect(loader.recognizerReleases, 0);

    speech.dictating(owner, 'note', false);
    await waitFor(() => loader.recognizerReleases == 1);
  });

  test('back in the foreground, the models stay a while after use again', () async {
    toBackground();
    toForeground();
    expect(await speech.transcribeClip(Int16List(sampleRate)), isA<Ok<String>>());
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(speech.isModelLoaded, isTrue);
    expect(loader.recognizerReleases, 0);
  });

  test('the screen stays on while a recording is transcribed, not for a clip', () async {
    expect(await speech.transcribeClip(Int16List(sampleRate)), isA<Ok<String>>());
    expect(deviceCalls, isEmpty);

    loader.gate = Completer<void>();
    final note = await addVoiceNote(notes);
    speech.transcribeNote(note.id);
    await waitFor(() => loader.calls.length == 2);
    expect(deviceCalls, ['keepScreenOn:true']);

    loader.gate!.complete();
    await waitFor(() => !speech.isTranscribing(note.id));
    await waitFor(() => deviceCalls.length == 2);
    expect(deviceCalls.last, 'keepScreenOn:false');
  });
}
