import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:nota/app/nota_app.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/settings/settings_store.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:nota/l10n/messages.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'memory_notes_repo.dart';

final _am = Messages.am;

Note _note(String id, String text, {NoteAudio? audio, bool pinned = false, bool favorite = false}) => Note(
  id: id,
  createdAt: DateTime.utc(2026, 9, 10),
  updatedAt: DateTime.utc(2026, 10, 20),
  text: text,
  audio: audio,
  pinned: pinned,
  favorite: favorite,
);

/// A small phone, Amharic, dark, and text at twice its size: nothing may overflow.
void main() {
  setUpAll(initializeDateFormatting);

  late Directory modelsDir;
  late ModelStore models;

  setUp(() async {
    modelsDir = await Directory.systemTemp.createTemp('nota_large_models');
    models = await ModelStore.open(directory: modelsDir);
  });

  tearDown(() async {
    models.dispose();
    await modelsDir.delete(recursive: true);
  });

  testWidgets('the screens fit a small phone with large Amharic text in the dark', (tester) async {
    tester.view
      ..physicalSize = const Size(360 * 3, 640 * 3)
      ..devicePixelRatio = 3;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(() {
      tester.view.reset();
      tester.platformDispatcher.clearTextScaleFactorTestValue();
    });

    SharedPreferences.setMockInitialValues({
      'settings.locale': 'am',
      'settings.themeMode': 'dark',
      'settings.calendar': 'both',
      'settings.onboarded': false,
    });
    final settings = await SettingsStore.load();
    final repo = MemoryNotesRepo([
      _note(
        '00000000-0000-4000-8000-000000000011',
        '# የሳምንቱ ስብሰባ ማስታወሻ ከቡድኑ ጋር በጣም ረጅም ርዕስ ያለው\nዛሬ ስለ አዲሱ ፕሮጀክት ተነጋገርን። #ስራ/ስብሰባ [[ዕቅድ]]',
        pinned: true,
        favorite: true,
      ),
      _note('00000000-0000-4000-8000-000000000012', 'ዕቅድ\nየሚቀጥለው ሳምንት'),
      _note(
        '00000000-0000-4000-8000-000000000013',
        '',
        audio: const NoteAudio(durationMs: 65000, transcription: TranscriptionPending()),
      ),
    ]);
    final notes = await NotesStore.open(repo, settings: settings);
    final speech = SpeechService(models: models, notes: notes);
    addTearDown(() {
      speech.dispose();
      notes.dispose();
      settings.dispose();
    });

    await tester.pumpWidget(NotaApp(settings: settings, notes: notes, models: models, speech: speech));
    await tester.pumpAndSettle();
    expect(find.text(_am.notes.introTitle), findsOneWidget);

    // The drawer, with its sections and the nested tag.
    await tester.tap(find.byType(DrawerButton));
    await tester.pumpAndSettle();
    expect(find.text(_am.sections.voice), findsOneWidget);
    final drawerList = find.descendant(of: find.byType(Drawer), matching: find.byType(Scrollable));
    final expand = find.byTooltip(_am.sections.expandTag('ስራ'));
    await tester.scrollUntilVisible(expand, 200, scrollable: drawerList);
    await tester.ensureVisible(expand);
    await tester.pumpAndSettle();
    await tester.tap(expand);
    await tester.pumpAndSettle();
    expect(find.text('ስብሰባ'), findsOneWidget);

    // Settings, from the drawer.
    final settingsEntry = find.text(_am.settings.title);
    await tester.scrollUntilVisible(settingsEntry, 200, scrollable: drawerList);
    await tester.ensureVisible(settingsEntry);
    await tester.pumpAndSettle();
    await tester.tap(settingsEntry);
    await tester.pumpAndSettle();
    expect(find.text(_am.settings.language.toUpperCase()), findsOneWidget);
    await tester.tap(find.byType(BackButton)); // pageBack() looks for the English tooltip
    await tester.pumpAndSettle();

    // The welcome goes; the voice note's row says it isn't transcribed yet.
    final list = find.byWidgetPredicate((widget) => widget is Scrollable && widget.axisDirection == AxisDirection.down);
    final dismiss = find.text(_am.notes.introDismiss);
    await tester.scrollUntilVisible(dismiss, 200, scrollable: list);
    await tester.ensureVisible(dismiss);
    await tester.pumpAndSettle();
    await tester.tap(dismiss);
    await tester.pumpAndSettle();
    expect(find.text(_am.notes.introTitle), findsNothing);
    final pending = find.text(_am.audio.badgePending);
    await tester.scrollUntilVisible(pending, 200, scrollable: list);
    expect(pending, findsOneWidget);

    // A note, its menu and its info.
    final plan = find.text('ዕቅድ', findRichText: true).first;
    await tester.scrollUntilVisible(plan, -200, scrollable: list);
    await tester.ensureVisible(plan);
    await tester.pumpAndSettle();
    await tester.tap(plan);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip(_am.editor.actions));
    await tester.pumpAndSettle();
    expect(find.text(_am.editor.assist), findsOneWidget);
    await tester.tapAt(Offset.zero);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip(_am.editor.info));
    await tester.pumpAndSettle();
    final linkedFrom = find.text(_am.editor.linkedFrom);
    await tester.scrollUntilVisible(linkedFrom, 200, scrollable: list.last);
    expect(linkedFrom, findsOneWidget, reason: 'the first note links here');
  });
}
