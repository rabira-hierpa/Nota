import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:nota/app/app_scope.dart';
import 'package:nota/app/nota_app.dart';
import 'package:nota/app/theme.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/screens/home_screen.dart';
import 'package:nota/features/notes/screens/note_screen.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/notes/widgets/note_tile.dart';
import 'package:nota/features/settings/settings_store.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:nota/l10n/messages.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'memory_notes_repo.dart';

final _en = Messages.en;

/// A title or preview in the list, which is written as rich text (search words are marked in it).
Finder _listed(String text) => find.text(text, findRichText: true);

Finder _editorField() => find.descendant(of: find.byType(NoteScreen), matching: find.byType(TextField));

void main() {
  setUpAll(initializeDateFormatting);

  late Directory modelsDir;
  late ModelStore models;
  late MemoryNotesRepo repo;

  setUp(() async {
    modelsDir = await Directory.systemTemp.createTemp('nota_home_models');
    models = await ModelStore.open(directory: modelsDir);
    repo = MemoryNotesRepo();
  });

  tearDown(() async {
    models.dispose();
    await modelsDir.delete(recursive: true);
  });

  /// The whole app over [repo], with the welcome already dismissed unless [onboarded] is false,
  /// speaking [locale].
  Future<NotesStore> pumpNota(WidgetTester tester, {bool onboarded = true, String locale = 'en'}) async {
    SharedPreferences.setMockInitialValues({'settings.onboarded': onboarded, 'settings.locale': locale});
    final settings = await SettingsStore.load();
    final notes = await NotesStore.open(repo, settings: settings);
    final speech = SpeechService(models: models, notes: notes);
    addTearDown(() {
      speech.dispose();
      notes.dispose();
      settings.dispose();
    });
    await tester.pumpWidget(NotaApp(settings: settings, notes: notes, models: models, speech: speech));
    await tester.pumpAndSettle();
    return notes;
  }

  Future<void> openSection(WidgetTester tester, String title) async {
    await tester.tap(find.byTooltip('Open navigation menu'));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byType(Drawer), matching: find.text(title)));
    await tester.pumpAndSettle();
  }

  testWidgets('create a note, find it, trash it and restore it', (tester) async {
    await pumpNota(tester);
    expect(find.text(_en.notes.emptyAll), findsOneWidget);

    // Write a note; it saves as you type and is listed when you go back.
    await tester.tap(find.byTooltip(_en.notes.newNote));
    await tester.pumpAndSettle();
    await tester.enterText(_editorField(), 'Shopping list\nmilk and bread');
    await tester.pump(const Duration(milliseconds: 500));
    expect(repo.saved.values.single.text, 'Shopping list\nmilk and bread', reason: 'saved after a pause in typing');
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(_listed('Shopping list'), findsOneWidget);
    expect(_listed('milk and bread'), findsOneWidget);

    // The search narrows the list.
    await tester.enterText(find.byType(TextField), 'bread');
    await tester.pumpAndSettle();
    expect(_listed('Shopping list'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'zebra');
    await tester.pumpAndSettle();
    expect(_listed('Shopping list'), findsNothing);
    expect(find.text(_en.notes.noMatch(_en.sections.all, 'zebra')), findsOneWidget);
    await tester.tap(find.byTooltip(_en.notes.clearSearch));
    await tester.pumpAndSettle();
    expect(_listed('Shopping list'), findsOneWidget);

    // A swipe moves it to the Trash.
    await tester.drag(_listed('Shopping list'), const Offset(-600, 0));
    await tester.pumpAndSettle();
    expect(_listed('Shopping list'), findsNothing);
    expect(find.text(_en.notes.movedToTrash), findsOneWidget);
    expect(repo.saved.values.single.isTrashed, isTrue);

    // In the Trash it opens read-only, and Restore brings it back.
    await openSection(tester, _en.sections.trash);
    expect(_listed('Shopping list'), findsOneWidget);
    await tester.tap(_listed('Shopping list'));
    await tester.pumpAndSettle();
    expect(find.text(_en.editor.trashBanner), findsOneWidget);
    expect(tester.widget<TextField>(_editorField()).readOnly, isTrue);
    await tester.tap(find.text(_en.editor.restore));
    await tester.pumpAndSettle();
    expect(find.text(_en.editor.trashBanner), findsNothing);
    expect(tester.widget<TextField>(_editorField()).readOnly, isFalse);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text(_en.notes.emptyTrash), findsOneWidget);

    await openSection(tester, _en.sections.all);
    expect(_listed('Shopping list'), findsOneWidget);
    expect(repo.saved.values.single.isTrashed, isFalse);
  });

  testWidgets('Undo after a swipe puts the note back', (tester) async {
    repo.saved['00000000-0000-4000-8000-000000000001'] = Note(
      id: '00000000-0000-4000-8000-000000000001',
      createdAt: DateTime.utc(2026, 11, 1),
      updatedAt: DateTime.utc(2026, 11, 1),
      text: 'Keep me',
    );
    await pumpNota(tester);

    await tester.drag(_listed('Keep me'), const Offset(-600, 0));
    await tester.pumpAndSettle();
    expect(_listed('Keep me'), findsNothing);
    await tester.tap(find.text(_en.common.undo));
    await tester.pumpAndSettle();
    expect(_listed('Keep me'), findsOneWidget);
    expect(repo.saved.values.single.isTrashed, isFalse);
  });

  testWidgets('a new note left empty is deleted', (tester) async {
    final notes = await pumpNota(tester);

    await tester.tap(find.byTooltip(_en.notes.newNote));
    await tester.pumpAndSettle();
    expect(notes.all, hasLength(1));
    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(notes.all, isEmpty);
    expect(repo.saved, isEmpty);
    expect(find.text(_en.notes.emptyAll), findsOneWidget);
  });

  testWidgets('a note filed under a tag shows under that tag in the drawer', (tester) async {
    repo.saved['00000000-0000-4000-8000-000000000002'] = Note(
      id: '00000000-0000-4000-8000-000000000002',
      createdAt: DateTime.utc(2026, 11, 1),
      updatedAt: DateTime.utc(2026, 11, 1),
      text: 'Standup\n#work/meetings',
    );
    await pumpNota(tester);

    await tester.tap(find.byTooltip('Open navigation menu'));
    await tester.pumpAndSettle();
    expect(find.text('meetings'), findsNothing, reason: 'nested tags start folded');
    await tester.tap(find.byTooltip(_en.sections.expandTag('work')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('meetings'));
    await tester.pumpAndSettle();

    expect(
      find.descendant(of: find.byType(AppBar), matching: find.text('#work/meetings')),
      findsOneWidget,
      reason: 'the section title',
    );
    expect(_listed('Standup'), findsOneWidget);
  });

  testWidgets('the welcome shows on first launch until dismissed', (tester) async {
    await pumpNota(tester, onboarded: false);

    expect(find.text(_en.notes.introTitle), findsOneWidget);
    expect(find.text(_en.notes.introSetUpSpeech), findsOneWidget, reason: 'no speech model yet');
    await tester.tap(find.text(_en.notes.introDismiss));
    await tester.pumpAndSettle();

    expect(find.text(_en.notes.introTitle), findsNothing);
    expect(find.text(_en.notes.emptyAll), findsOneWidget);
  });

  testWidgets('the app starts in Amharic, with Material in Amharic too', (tester) async {
    await pumpNota(tester, locale: 'am');
    final am = Messages.am;

    expect(find.text(am.notes.emptyAll), findsOneWidget);
    // The drawer's button is labelled by Material's Amharic localizations, not the app's.
    final context = tester.element(find.byType(Scaffold).first);
    expect(Localizations.localeOf(context), const Locale('am'));
    await tester.tap(find.byTooltip(MaterialLocalizations.of(context).openAppDrawerTooltip));
    await tester.pumpAndSettle();
    expect(find.descendant(of: find.byType(Drawer), matching: find.text(am.sections.trash)), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the lines between notes turn dark with the theme', (tester) async {
    repo.saved['00000000-0000-4000-8000-000000000003'] = Note(
      id: '00000000-0000-4000-8000-000000000003',
      createdAt: DateTime.utc(2026, 11, 1),
      updatedAt: DateTime.utc(2026, 11, 1),
      text: 'Evening',
    );
    await pumpNota(tester);

    // As when iOS turns dark at sunset: the theme animates from light to dark.
    await AppScope.of(tester.element(find.byType(HomeScreen))).settings.setThemeMode(ThemeMode.dark);
    await tester.pumpAndSettle();

    final row = find.ancestor(of: find.byType(NoteTile), matching: find.byType(DecoratedBox)).first;
    final border = (tester.widget<DecoratedBox>(row).decoration as BoxDecoration).border! as Border;
    expect(border.bottom.color, NotaColors.dark.line);
  });
}
