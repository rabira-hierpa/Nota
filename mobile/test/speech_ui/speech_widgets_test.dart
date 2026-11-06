import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/app/app_scope.dart';
import 'package:nota/app/theme.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/settings/settings_store.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/screens/speech_models_screen.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:nota/features/speech/widgets/dictation_button.dart';
import 'package:nota/features/speech/widgets/transcription_chip.dart';
import 'package:nota/l10n/messages.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';

import 'speech_fixtures.dart';

void main() {
  late Directory root;
  late SettingsStore settings;
  late NotesStore notes;
  late ModelStore models;
  late FakeLoader loader;
  late SpeechService speech;
  final en = Messages.en;

  Future<void> openStores({required bool ready}) async {
    models = await fakeModelStore(Directory(p.join(root.path, 'models')), ready: ready);
    speech = SpeechService(models: models, notes: notes, loader: loader);
  }

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    root = await Directory.systemTemp.createTemp('nota_widgets_');
    settings = await SettingsStore.load();
    notes = await notesStoreIn(Directory(p.join(root.path, 'notes')));
    loader = FakeLoader();
  });

  tearDown(() async {
    speech.dispose();
    notes.dispose();
    models.dispose();
    await root.delete(recursive: true);
  });

  Widget app(Widget home, {String locale = 'en', TargetPlatform platform = TargetPlatform.android}) => AppScope(
    settings: settings,
    notes: notes,
    models: models,
    speech: speech,
    child: MaterialApp(
      theme: NotaTheme.light.copyWith(platform: platform),
      locale: Locale(locale),
      supportedLocales: Messages.supportedLocales,
      localizationsDelegates: Messages.localizationsDelegates,
      home: home,
    ),
  );

  group('TranscriptionChip', () {
    /// The chip for the note as the store has it now, as the note list shows it.
    Widget chipFor(String id) => Scaffold(
      body: ListenableBuilder(
        listenable: notes,
        builder: (context, _) => TranscriptionChip(note: notes.byId(id)!),
      ),
    );

    testWidgets('shows a recording not yet transcribed, and a failure', (tester) async {
      await tester.runAsync(() => openStores(ready: true));
      final note = (await tester.runAsync(() => addVoiceNote(notes)))!;
      await tester.pumpWidget(app(chipFor(note.id)));
      expect(find.text(en.audio.badgePending), findsOneWidget);

      await tester.runAsync(() => notes.setTranscription(note.id, TranscriptionFailed(en.speech.failed)));
      await tester.pump();
      expect(find.text(en.audio.badgeFailed), findsOneWidget);
    });

    testWidgets('shows progress while transcribing, then nothing', (tester) async {
      await tester.runAsync(() => openStores(ready: true));
      final note = (await tester.runAsync(() => addVoiceNote(notes)))!;
      loader.gate = Completer<void>();
      await tester.pumpWidget(app(chipFor(note.id)));
      await tester.runAsync(() async {
        speech.transcribeNote(note.id);
        await waitFor(() => loader.calls.length == 1);
      });
      await tester.pump();
      expect(find.text(en.speech.transcribingPercent(0)), findsOneWidget);

      await tester.runAsync(() async {
        loader.gate!.complete();
        await waitFor(() => !speech.isTranscribing(note.id));
      });
      await tester.pump();
      expect(find.byType(Text), findsNothing);
    });

    testWidgets('is empty for a note without a recording', (tester) async {
      await tester.runAsync(() => openStores(ready: true));
      final note = (await tester.runAsync(() => notes.create(text: 'typed')))!;
      await tester.pumpWidget(app(chipFor(note.id)));
      expect(find.byType(Text), findsNothing);
    });
  });

  group('SpeechModelsScreen', () {
    /// A screen tall enough to build the whole list at once.
    void tallView(WidgetTester tester) {
      tester.view
        ..physicalSize = const Size(800, 5000)
        ..devicePixelRatio = 1;
      addTearDown(tester.view.reset);
    }

    testWidgets('without the files: what is missing, and how to add them on Android', (tester) async {
      tallView(tester);
      await tester.runAsync(() => openStores(ready: false));
      await tester.pumpWidget(app(const SpeechModelsScreen()));
      expect(find.text(en.speech.title), findsOneWidget);
      expect(find.text(en.speech.notSetUp), findsOneWidget);
      expect(find.text(fakeHohe), findsOneWidget);
      expect(find.text(en.speech.fileMissing), findsNWidgets(3));
      expect(find.text(en.speech.importFiles), findsWidgets);
      expect(find.text(en.speech.downloadHeading), findsNothing);
      expect(find.text(en.speech.delete), findsNothing);
      expect(
        find.textContaining('adb push $fakeHohe $fakeTokens $fakePunctuation ${models.directory}/'),
        findsOneWidget,
      );
      expect(find.text(en.speech.memory), findsOneWidget);
    });

    testWidgets('with the files: ready, and they can be deleted', (tester) async {
      tallView(tester);
      await tester.runAsync(() => openStores(ready: true));
      await tester.pumpWidget(app(const SpeechModelsScreen()));
      expect(find.text(en.speech.ready), findsOneWidget);
      expect(find.text(en.speech.fileReady), findsNWidgets(3));

      await tester.tap(find.text(en.speech.delete));
      await tester.pumpAndSettle();
      expect(find.text(en.speech.confirmDelete(formatBytes(models.totalBytes))), findsOneWidget);
      await tester.tap(find.text(en.common.cancel));
      await tester.pumpAndSettle();
      expect(models.status.isReady, isTrue);
    });

    testWidgets('on iOS: Finder and the Files app, no adb', (tester) async {
      tallView(tester);
      await tester.runAsync(() => openStores(ready: false));
      await tester.pumpWidget(app(const SpeechModelsScreen(), platform: TargetPlatform.iOS));
      expect(find.text(en.speech.usbIos), findsOneWidget);
      expect(find.textContaining('adb push'), findsNothing);
    });

    testWidgets('speaks Amharic', (tester) async {
      await tester.runAsync(() => openStores(ready: false));
      await tester.pumpWidget(app(const SpeechModelsScreen(), locale: 'am'));
      expect(find.text(Messages.am.speech.title), findsOneWidget);
      expect(find.text(Messages.am.speech.notSetUp), findsOneWidget);
    });
  });

  group('DictationButton', () {
    testWidgets('opens Speech models when the model is missing', (tester) async {
      await tester.runAsync(() => openStores(ready: false));
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      final note = (await tester.runAsync(() => notes.create()))!;
      await tester.pumpWidget(
        app(
          Scaffold(
            appBar: AppBar(
              actions: [DictationButton(controller: controller, noteId: note.id)],
            ),
          ),
        ),
      );
      expect(find.byTooltip(en.editor.dictateHint), findsOneWidget);
      await tester.tap(find.byTooltip(en.editor.dictateHint));
      await tester.pumpAndSettle();
      expect(find.byType(SpeechModelsScreen), findsOneWidget);
    });
  });
}
