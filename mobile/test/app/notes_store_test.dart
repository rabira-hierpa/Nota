import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/data/notes_repo.dart';
import 'package:nota/features/notes/logic/sections.dart';
import 'package:nota/features/notes/state/notes_store.dart';
import 'package:nota/features/settings/settings_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'memory_notes_repo.dart';

void main() {
  late Directory dir;
  late NotesRepo repo;
  late NotesStore store;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('nota_store_test');
    repo = await NotesRepo.open(dir);
    store = await NotesStore.open(repo);
  });

  tearDown(() async {
    store.dispose();
    await dir.delete(recursive: true);
  });

  Future<List<Note>> onDisk() async => switch (await repo.loadAll()) {
    Ok(:final value) => value,
    Err(:final message) => fail('loadAll failed: $message'),
  };

  List<String> titles(List<Note> notes) => [for (final note in notes) note.text.split('\n').first];

  test('a new note is listed, saved, and read back by a new store', () async {
    final note = await store.create(text: 'Shopping\nmilk');

    expect(store.byId(note.id)?.text, 'Shopping\nmilk');
    expect(titles(store.visible), ['Shopping']);
    expect(titles(await onDisk()), ['Shopping']);

    final reopened = await NotesStore.open(repo);
    expect(reopened.byId(note.id)?.text, 'Shopping\nmilk');
    reopened.dispose();
  });

  test('updateText changes the text and the edited time, in memory at once', () async {
    final note = await store.create(text: 'one');
    final edit = store.updateText(note.id, 'two');

    expect(store.byId(note.id)?.text, 'two', reason: 'the list sees the edit before the disk does');
    await edit;
    final saved = (await onDisk()).single;
    expect(saved.text, 'two');
    expect(saved.updatedAt.isBefore(note.updatedAt), isFalse);
  });

  test('the search narrows the list by words and #tags', () async {
    await store.create(text: 'Market\nbuy #food');
    await store.create(text: 'Meeting\nagenda #work');

    store.query = 'agenda';
    expect(titles(store.visible), ['Meeting']);
    store.query = '#food';
    expect(titles(store.visible), ['Market']);
    store.query = 'nothing-like-this';
    expect(store.visible, isEmpty);
    store.query = '';
    expect(store.visible, hasLength(2));
  });

  test('trash and restore move a note between the list and the Trash', () async {
    final note = await store.create(text: 'Draft');

    await store.trash(note.id);
    expect(store.visible, isEmpty);
    expect(store.counts[FixedSectionKind.trash], 1);
    expect((await onDisk()).single.isTrashed, isTrue);

    store.section = NoteSection.trash;
    expect(titles(store.visible), ['Draft']);

    await store.restore(note.id);
    expect(store.visible, isEmpty);
    store.section = NoteSection.all;
    expect(titles(store.visible), ['Draft']);
    expect((await onDisk()).single.isTrashed, isFalse);
  });

  test('deleteForever and emptyTrash remove notes from memory and disk', () async {
    final kept = await store.create(text: 'Kept');
    final gone = await store.create(text: 'Gone');
    final trashed = await store.create(text: 'Trashed');

    await store.deleteForever(gone.id);
    await store.trash(trashed.id);
    await store.emptyTrash();

    expect(store.all.map((note) => note.id), [kept.id]);
    expect((await onDisk()).map((note) => note.id), [kept.id]);
  });

  test('a change that lands while a note is deleted for good does not bring it back', () async {
    final voice = Note.create(audio: const NoteAudio(durationMs: 1000, transcription: TranscriptionPending()));
    await store.add(voice);
    final other = await store.create(text: 'Other');
    await store.trash(voice.id);
    await store.trash(other.id);

    // A transcription finishing while the delete is on its way to the disk.
    final deleting = store.deleteForever(voice.id);
    final done = TranscriptionDone(transcribedAt: DateTime.utc(2026, 11, 2), model: 'hohe');
    final late = store.setTranscription(voice.id, done, text: 'late words');
    await Future.wait([deleting, late]);
    // And an edit while the Trash is being emptied.
    final emptying = store.emptyTrash();
    final typed = store.updateText(other.id, 'typed');
    await Future.wait([emptying, typed]);

    expect(store.all, isEmpty);
    expect(await onDisk(), isEmpty, reason: 'no note file comes back after its delete');
    final reopened = await NotesStore.open(repo);
    expect(reopened.all, isEmpty);
    reopened.dispose();
  });

  test('a delete that fails keeps the note, and says so', () async {
    final memory = MemoryNotesRepo();
    final failing = await NotesStore.open(memory);
    final note = await failing.create(text: 'stays');
    await failing.trash(note.id);
    final failures = <NotesFailure>[];
    final subscription = failing.failures.listen(failures.add);

    memory.failDeletes = true;
    await failing.deleteForever(note.id);
    await failing.emptyTrash();
    await pumpEventQueue();

    expect(failures, [NotesFailure.delete, NotesFailure.delete]);
    expect(failing.byId(note.id)?.text, 'stays');
    expect(memory.saved.keys, [note.id]);
    await subscription.cancel();
    failing.dispose();
  });

  test('favorite, pin and archive are kept', () async {
    final note = await store.create(text: 'Flags');

    await store.favorite(note.id);
    await store.pin(note.id);
    await store.archive(note.id);

    final saved = (await onDisk()).single;
    expect([saved.favorite, saved.pinned, saved.isArchived], [true, true, true]);
    expect(store.visible, isEmpty, reason: 'archived notes leave the main list');

    await store.unarchive(note.id);
    await store.favorite(note.id, value: false);
    await store.pin(note.id, value: false);
    final back = (await onDisk()).single;
    expect([back.favorite, back.pinned, back.isArchived], [false, false, false]);
  });

  test('a transcription with text replaces the text and tells the editor', () async {
    final note = Note.create(audio: const NoteAudio(durationMs: 1000, transcription: TranscriptionPending()));
    await store.add(note);
    final replaced = <String>[];
    final subscription = store.textReplaced.listen(replaced.add);

    final done = TranscriptionDone(transcribedAt: DateTime.utc(2026, 11, 2), model: 'hohe');
    await store.setTranscription(note.id, done, text: 'transcript');
    await pumpEventQueue();

    expect(store.byId(note.id)?.text, 'transcript');
    expect(store.byId(note.id)?.audio?.transcription, isA<TranscriptionDone>());
    expect(replaced, [note.id]);

    await store.setTranscription(note.id, const TranscriptionFailed('x'));
    await pumpEventQueue();
    expect(replaced, [note.id], reason: 'no text, nothing to reload');
    expect(store.byId(note.id)?.text, 'transcript');
    await subscription.cancel();
  });

  test('attachAudio keeps a recording with a note', () async {
    final note = await store.create(text: 'dictated');
    await store.attachAudio(note.id, const NoteAudio(durationMs: 5000, transcription: TranscriptionPending()));

    expect((await onDisk()).single.audio?.durationMs, 5000);
    store.section = NoteSection.voice;
    expect(store.visible.single.id, note.id);
  });

  test('the tag tree leaves out notes in the Trash', () async {
    await store.create(text: 'a #work/meetings');
    final trashed = await store.create(text: 'b #old');
    await store.trash(trashed.id);

    expect([for (final node in store.tagTree) node.path], ['work']);
    expect(store.tagTree.single.children.single.path, 'work/meetings');
  });

  test('the list follows the sort order chosen in Settings', () async {
    SharedPreferences.setMockInitialValues({});
    final settings = await SettingsStore.load();
    final sorted = await NotesStore.open(repo, settings: settings);
    final early = DateTime.utc(2026, 10, 1);
    final late = DateTime.utc(2026, 10, 2);
    // Banana was written first but edited last.
    await sorted.add(Note(id: newNoteId(), createdAt: early, updatedAt: late, text: 'Banana'));
    await sorted.add(
      Note(id: newNoteId(), createdAt: late, updatedAt: late.subtract(const Duration(hours: 1)), text: 'Apple'),
    );

    expect(titles(sorted.visible), ['Banana', 'Apple'], reason: 'last edited first');
    await settings.setSortOrder(SortOrder.created);
    expect(titles(sorted.visible), ['Apple', 'Banana'], reason: 'last created first');
    await settings.setSortOrder(SortOrder.title);
    expect(titles(sorted.visible), ['Apple', 'Banana']);
    expect(sorted.sortOrder, SortOrder.title);
    sorted.dispose();
  });

  test('a failed save is reported, and a flag change is put back', () async {
    final memory = MemoryNotesRepo();
    final failing = await NotesStore.open(memory);
    final note = await failing.create(text: 'note');
    final failures = <NotesFailure>[];
    final subscription = failing.failures.listen(failures.add);

    memory.failSaves = true;
    await failing.favorite(note.id);
    await failing.updateText(note.id, 'typed');
    await pumpEventQueue();

    expect(failures, [NotesFailure.save, NotesFailure.save]);
    expect(failing.byId(note.id)?.favorite, isFalse, reason: 'the star comes off again');
    expect(failing.byId(note.id)?.text, 'typed', reason: 'typing is never thrown away');
    await subscription.cancel();
    failing.dispose();
  });

  test('a text past the limit is reported as too long', () async {
    final note = await store.create();
    final failures = <NotesFailure>[];
    final subscription = store.failures.listen(failures.add);

    await store.updateText(note.id, 'x' * (maxNoteTextLength + 1));
    await pumpEventQueue();

    expect(failures, [NotesFailure.tooLong]);
    unawaited(subscription.cancel());
  });
}
