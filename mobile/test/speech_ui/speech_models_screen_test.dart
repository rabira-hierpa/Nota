import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/app/app_scope.dart';
import 'package:nota/app/theme.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/settings/settings_store.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/screens/speech_models_screen.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:nota/l10n/messages.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';

import 'speech_fixtures.dart';

void main() {
  late Directory root;
  late SettingsStore settings;
  late NotesStore notes;
  late ModelStore models;
  late SpeechService speech;
  const names = '$fakeHohe, $fakeTokens, $fakePunctuation';

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    root = await Directory.systemTemp.createTemp('nota_speech_models_');
    settings = await SettingsStore.load();
    notes = await notesStoreIn(Directory(p.join(root.path, 'notes')));
    models = await fakeModelStore(Directory(p.join(root.path, 'models')), ready: false);
    speech = SpeechService(models: models, notes: notes, loader: FakeLoader());
  });

  tearDown(() async {
    speech.dispose();
    notes.dispose();
    models.dispose();
    await root.delete(recursive: true);
  });

  Widget app({required TargetPlatform platform, String locale = 'en'}) => AppScope(
    settings: settings,
    notes: notes,
    models: models,
    speech: speech,
    child: MaterialApp(
      theme: NotaTheme.light.copyWith(platform: platform),
      locale: Locale(locale),
      supportedLocales: Messages.supportedLocales,
      localizationsDelegates: Messages.localizationsDelegates,
      home: const SpeechModelsScreen(),
    ),
  );

  /// A screen tall enough to build the whole list at once.
  void tallView(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(800, 5000)
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);
  }

  group('the import hint', () {
    testWidgets('names a memory card on Android', (tester) async {
      tallView(tester);
      await tester.pumpWidget(app(platform: TargetPlatform.android));
      expect(find.text(Messages.en.speech.importHint(names)), findsOneWidget);
      expect(find.text(Messages.en.speech.importHintIos(names)), findsNothing);
    });

    testWidgets("names the Files app's places on iOS, which has no memory card", (tester) async {
      tallView(tester);
      await tester.pumpWidget(app(platform: TargetPlatform.iOS));
      expect(find.text(Messages.en.speech.importHintIos(names)), findsOneWidget);
      expect(find.text(Messages.en.speech.importHint(names)), findsNothing);
    });

    testWidgets('speaks Amharic on iOS', (tester) async {
      tallView(tester);
      await tester.pumpWidget(app(platform: TargetPlatform.iOS, locale: 'am'));
      expect(find.text(Messages.am.speech.importHintIos(names)), findsOneWidget);
    });
  });
}
