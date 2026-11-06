import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:nota/app/app_scope.dart';
import 'package:nota/app/theme.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/logic/summarize.dart';
import 'package:nota/features/notes/screens/note_screen.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/settings/settings_store.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:nota/features/speech/state/dictation_controller.dart';
import 'package:nota/features/speech/state/speech_service.dart';
import 'package:nota/features/speech/widgets/dictation_button.dart';
import 'package:nota/l10n/messages.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'memory_notes_repo.dart';

const _id = '00000000-0000-4000-8000-0000000000aa';

Finder _field() => find.descendant(of: find.byType(NoteScreen), matching: find.byType(TextField));

TextEditingController _controller(WidgetTester tester) => tester.widget<TextField>(_field()).controller!;

bool _editorFocused(WidgetTester tester) => tester.widget<TextField>(_field()).focusNode!.hasFocus;

void main() {
  setUpAll(initializeDateFormatting);

  late Directory modelsDir;
  late ModelStore models;

  setUp(() async {
    modelsDir = await Directory.systemTemp.createTemp('nota_editor_models');
    models = await ModelStore.open(directory: modelsDir);
  });

  tearDown(() async {
    models.dispose();
    await modelsDir.delete(recursive: true);
  });

  /// The editor on its own, over a home page it can go back to. [repo]
  /// holds what reached the "disk"; [screenReader] turns one on.
  Future<NotesStore> pumpEditor(
    WidgetTester tester,
    Note note, {
    MemoryNotesRepo? repo,
    bool screenReader = false,
  }) async {
    SharedPreferences.setMockInitialValues({'settings.onboarded': true});
    final settings = await SettingsStore.load();
    final notes = await NotesStore.open(repo ?? MemoryNotesRepo([note]), settings: settings);
    final speech = SpeechService(models: models, notes: notes);
    addTearDown(() {
      speech.dispose();
      notes.dispose();
      settings.dispose();
    });
    await tester.pumpWidget(
      AppScope(
        settings: settings,
        notes: notes,
        models: models,
        speech: speech,
        child: MaterialApp(
          theme: NotaTheme.light,
          supportedLocales: Messages.supportedLocales,
          localizationsDelegates: Messages.localizationsDelegates,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(accessibleNavigation: screenReader),
            child: child!,
          ),
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: TextButton(onPressed: () => NoteScreen.open(context, note.id), child: const Text('open')),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    return notes;
  }

  Note voiceNote(String text) => Note(
    id: _id,
    createdAt: DateTime.utc(2026, 11, 1),
    updatedAt: DateTime.utc(2026, 11, 1),
    text: text,
    audio: const NoteAudio(durationMs: 4000, transcription: TranscriptionPending()),
  );

  final done = TranscriptionDone(transcribedAt: DateTime.utc(2026, 11, 2), model: 'hohe');

  Note blankNote() =>
      Note(id: _id, createdAt: DateTime.utc(2026, 11, 1), updatedAt: DateTime.utc(2026, 11, 1), text: '');

  final hideKeyboard = find.byTooltip(Messages.en.editor.hideKeyboard);

  testWidgets('the keyboard can be put away, while the editor has it', (tester) async {
    await pumpEditor(tester, blankNote().copyWith(text: 'a few words'));
    expect(hideKeyboard, findsNothing);
    final mic = find.byType(DictationButton);
    final micAt = tester.getCenter(mic);

    await tester.tap(_field());
    await tester.pump();
    expect(_editorFocused(tester), isTrue);
    expect(hideKeyboard, findsOneWidget);
    expect(tester.getCenter(mic), micAt, reason: 'the other buttons stay where they were');

    await tester.tap(hideKeyboard);
    await tester.pump();
    expect(_editorFocused(tester), isFalse);
    expect(tester.testTextInput.isVisible, isFalse, reason: 'the keyboard is gone');
    expect(hideKeyboard, findsNothing);
  });

  testWidgets('a note in the Trash has no keyboard to put away', (tester) async {
    await pumpEditor(tester, voiceNote('old').copyWith(trashedAt: DateTime.utc(2026, 11, 2)));

    await tester.tap(_field());
    await tester.pump();

    expect(_editorFocused(tester), isTrue, reason: 'it can still be selected from');
    expect(hideKeyboard, findsNothing);
  });

  testWidgets('words dictated at the end of a long note are scrolled into view', (tester) async {
    final lines = [for (var i = 1; i <= 80; i++) 'Line $i of a long note.'];
    final notes = await pumpEditor(tester, blankNote().copyWith(text: lines.join('\n')));
    final controller = _controller(tester);
    final field = tester.state<EditableTextState>(find.descendant(of: _field(), matching: find.byType(EditableText)));
    final scroll = tester.state<ScrollableState>(find.descendant(of: _field(), matching: find.byType(Scrollable)));
    final end = field.renderEditable.getLocalRectForCaret(TextPosition(offset: controller.text.length));
    expect(scroll.position.pixels, 0);
    expect(end.top, greaterThan(field.renderEditable.size.height), reason: 'the end of the note starts out of view');

    // What the microphone button does with each piece it hears.
    final spoken = List.filled(12, 'These words were spoken at the end of the note.').join(' ');
    controller.value = insertDictated(controller.value, spoken);
    tester.widget<DictationButton>(find.byType(DictationButton)).onTyped!();
    await tester.pump();

    final caret = field.renderEditable.getLocalRectForCaret(controller.selection.extent);
    expect(controller.selection.extent.offset, controller.text.length);
    expect(scroll.position.pixels, greaterThan(0));
    expect(caret.top, greaterThanOrEqualTo(0));
    expect(caret.bottom, lessThanOrEqualTo(field.renderEditable.size.height), reason: 'the caret is in view');
    expect(notes.byId(_id)?.text, endsWith(spoken), reason: 'saved at once, without waiting for the pause');
  });

  testWidgets('words dictated while the note closes are kept', (tester) async {
    final notes = await pumpEditor(tester, blankNote().copyWith(text: 'Before.'));
    final controller = _controller(tester);
    final dictate = tester.widget<DictationButton>(find.byType(DictationButton));

    await tester.pageBack();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(DictationButton), findsOneWidget, reason: 'the screen is still sliding away');
    controller.value = insertDictated(controller.value, 'said just before leaving');
    dictate.onTyped!();
    await tester.pumpAndSettle();

    expect(notes.byId(_id)?.text, 'Before. said just before leaving');
  });

  testWidgets('words dictated while the note closes keep a transcription that landed meanwhile', (tester) async {
    final notes = await pumpEditor(tester, voiceNote('Before.'));
    final controller = _controller(tester);
    final dictate = tester.widget<DictationButton>(find.byType(DictationButton));

    await tester.pageBack();
    await tester.pump(const Duration(milliseconds: 50));
    await notes.setTranscription(_id, done, text: 'Before.\n\nThe whole recording.');
    await tester.pump();
    controller.value = insertDictated(controller.value, 'said just before leaving');
    dictate.onTyped!();
    await tester.pumpAndSettle();

    final text = notes.byId(_id)!.text;
    expect(text, contains('The whole recording.'));
    expect(text, contains('said just before leaving'));
  });

  testWidgets('going to the background saves what was typed, without waiting for the pause', (tester) async {
    final repo = MemoryNotesRepo([voiceNote('start')]);
    await pumpEditor(tester, voiceNote('start'), repo: repo);

    await tester.enterText(_field(), 'start, then the phone rang');
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump();
    expect(repo.saved[_id]?.text, 'start, then the phone rang');

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump(const Duration(milliseconds: 500));
  });

  testWidgets('a transcript arriving while the first words are typed goes below them', (tester) async {
    final notes = await pumpEditor(tester, voiceNote(''));

    await tester.enterText(_field(), 'Title');
    await notes.setTranscription(_id, done, text: appendTranscript('', 'spoken words'));
    await tester.pump();

    expect(_controller(tester).text, 'Title\n\nspoken words');
    await tester.pump(const Duration(milliseconds: 500));
    expect(notes.byId(_id)?.text, 'Title\n\nspoken words', reason: 'the merge is saved');
  });

  testWidgets('a transcript never drops words typed after a saved trailing space', (tester) async {
    final notes = await pumpEditor(tester, voiceNote('abc '));

    await tester.enterText(_field(), 'abc def');
    await notes.setTranscription(_id, done, text: appendTranscript('abc ', 'spoken'));
    await tester.pump();

    expect(_controller(tester).text, 'abc def\n\nspoken');
    await tester.pump(const Duration(milliseconds: 500));
    expect(notes.byId(_id)?.text, 'abc def\n\nspoken');
  });

  testWidgets('an editor below follows the same note edited in one above it', (tester) async {
    final notes = await pumpEditor(tester, voiceNote('one'));
    final below = _controller(tester);

    // The same note opened again over itself (through a link to it).
    final context = tester.element(find.byType(NoteScreen));
    unawaited(NoteScreen.open(context, _id));
    await tester.pumpAndSettle();
    await tester.enterText(_field().last, 'one, two');
    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(below.text, 'one, two');
    await tester.enterText(_field(), 'one, two, three');
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(notes.byId(_id)?.text, 'one, two, three');
  });

  testWidgets("a recording can't be played or sent for transcription while dictation still types its words", (
    tester,
  ) async {
    await pumpEditor(tester, voiceNote(''));
    final speech = AppScope.of(tester.element(find.byType(NoteScreen))).speech;
    final transcribe = find.widgetWithText(TextButton, Messages.en.audio.transcribe);
    IconButton play() => tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.play_arrow));
    final pendingHint = find.text(Messages.en.editor.pending);
    expect(transcribe, findsOneWidget);
    expect(play().onPressed, isNotNull);
    expect(pendingHint, findsOneWidget);

    final dictation = Object();
    speech.dictating(dictation, _id, true);
    await tester.pump();
    expect(transcribe, findsNothing);
    expect(play().onPressed, isNull, reason: 'the microphone would hear it');
    expect(pendingHint, findsNothing, reason: "the words are on their way: no 'press Transcribe'");

    speech.dictating(dictation, _id, false);
    await tester.pump();
    expect(transcribe, findsOneWidget);
    expect(play().onPressed, isNotNull);
  });

  testWidgets('a voice note left without text is kept', (tester) async {
    final notes = await pumpEditor(tester, voiceNote(''));

    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(notes.byId(_id), isNotNull);
  });

  testWidgets('a note opened empty and left empty is deleted', (tester) async {
    final repo = MemoryNotesRepo([blankNote()]);
    final notes = await pumpEditor(tester, blankNote(), repo: repo);

    await tester.enterText(_field(), '   ');
    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(notes.byId(_id), isNull);
    expect(repo.saved, isEmpty);
  });

  testWidgets('an empty note is kept when the microphone was touched: dictated words may still come', (tester) async {
    final notes = await pumpEditor(tester, blankNote());

    final press = await tester.startGesture(tester.getCenter(find.byTooltip(Messages.en.editor.dictateHint)));
    await press.cancel();
    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(notes.byId(_id), isNotNull);
  });

  testWidgets('an empty note is kept while a screen reader is on', (tester) async {
    final notes = await pumpEditor(tester, blankNote(), screenReader: true);

    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(notes.byId(_id), isNotNull);
  });

  testWidgets('a transcription added at the end keeps what was being typed', (tester) async {
    final notes = await pumpEditor(tester, voiceNote('first'));
    final controller = _controller(tester);

    // Typed, not yet saved (the pause before saving hasn't passed).
    await tester.enterText(_field(), 'first, typed');
    controller.selection = const TextSelection.collapsed(offset: 3);
    await notes.setTranscription(_id, done, text: 'first\n\nspoken');
    await tester.pump();

    expect(controller.text, 'first, typed\n\nspoken');
    expect(controller.selection, const TextSelection.collapsed(offset: 3), reason: 'the caret stays put');
    await tester.pump(const Duration(milliseconds: 500));
    expect(notes.byId(_id)?.text, 'first, typed\n\nspoken');
  });

  testWidgets('a transcription that replaces the text replaces it in the editor', (tester) async {
    final notes = await pumpEditor(tester, voiceNote(''));

    await notes.setTranscription(_id, done, text: 'the whole transcript');
    await tester.pump();

    expect(_controller(tester).text, 'the whole transcript');
  });

  testWidgets('leaving saves at once, without waiting for the pause', (tester) async {
    final notes = await pumpEditor(tester, voiceNote('start'));

    await tester.enterText(_field(), 'start and more');
    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(notes.byId(_id)?.text, 'start and more');
  });

  testWidgets('a note in the Trash opens read-only and can be deleted for good', (tester) async {
    final trashed = voiceNote('old').copyWith(trashedAt: DateTime.utc(2026, 11, 2));
    final notes = await pumpEditor(tester, trashed);
    final editor = Messages.en.editor;

    expect(tester.widget<TextField>(_field()).readOnly, isTrue);
    await tester.tap(find.text(editor.deleteForever));
    await tester.pumpAndSettle();
    expect(find.text(editor.confirmDelete), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, editor.deleteForever).last);
    await tester.pumpAndSettle();

    expect(notes.byId(_id), isNull);
    expect(find.byType(NoteScreen), findsNothing, reason: 'the editor closes');
  });

  testWidgets('Summarize and organize adds the key sentences under the title', (tester) async {
    const meeting =
        'የሳምንቱ ስብሰባ\n'
        'ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ። መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል። '
        'ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ። የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት። '
        'በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል። በጀቱ ለሶስት ወር በቂ ነው። ተጨማሪ በጀት ለማግኘት ማመልከቻ እንጽፋለን።';
    final notes = await pumpEditor(
      tester,
      Note(id: _id, createdAt: DateTime.utc(2026, 11, 1), updatedAt: DateTime.utc(2026, 11, 1), text: meeting),
    );
    final editor = Messages.en.editor;

    await tester.tap(find.byTooltip(editor.actions));
    await tester.pumpAndSettle();
    await tester.tap(find.text(editor.assist));
    await tester.pump();
    // The sheet works the text out on another isolate.
    await tester.runAsync(() => Future<void>.delayed(const Duration(seconds: 2)));
    await tester.pumpAndSettle();
    expect(find.text(editor.keySentences), findsOneWidget);

    await tester.tap(find.text(editor.addSummary));
    await tester.pump();
    await tester.runAsync(() => Future<void>.delayed(const Duration(seconds: 2)));
    await tester.pumpAndSettle();

    final lines = _controller(tester).text.split('\n');
    expect(lines.first, 'የሳምንቱ ስብሰባ');
    expect(lines[1], startsWith(summaryLabel));
    expect(find.text(editor.added), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 500));
    expect(notes.byId(_id)?.text, _controller(tester).text, reason: 'saved like typing');
  });
}
