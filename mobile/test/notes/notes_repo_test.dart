import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/data/notes_repo.dart';
import 'package:path/path.dart' as p;

void main() {
  late Directory dir;
  late NotesRepo repo;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('nota_repo_test');
    repo = await NotesRepo.open(dir);
  });

  tearDown(() async {
    await dir.delete(recursive: true);
  });

  List<Note> loaded(Result<List<Note>> result) => switch (result) {
    Ok(:final value) => value,
    Err(:final message) => fail('loadAll failed: $message'),
  };

  Future<void> saveOk(Note note) async {
    expect(await repo.save(note), isA<Ok<void>>());
  }

  List<String> fileNames() => dir.listSync().map((entity) => p.basename(entity.path)).toList()..sort();

  final at = DateTime.utc(2026, 10, 30, 9, 41);

  test('a saved note reads back with every field', () async {
    final note = Note(
      id: newNoteId(),
      createdAt: at,
      updatedAt: at.add(const Duration(minutes: 5)),
      text: 'ሰላም\n#work/plans [[Other]]',
      favorite: true,
      pinned: true,
      archivedAt: at.add(const Duration(days: 1)),
      audio: NoteAudio(
        durationMs: 65000,
        transcription: TranscriptionDone(transcribedAt: at.add(const Duration(minutes: 1)), model: 'hohe'),
      ),
    );
    await saveOk(note);

    final notes = loaded(await repo.loadAll());
    expect(notes, hasLength(1));
    final back = notes.single;
    expect(back.id, note.id);
    expect(back.createdAt, note.createdAt);
    expect(back.updatedAt, note.updatedAt);
    expect(back.text, note.text);
    expect(back.favorite, isTrue);
    expect(back.pinned, isTrue);
    expect(back.archivedAt, note.archivedAt);
    expect(back.trashedAt, isNull);
    expect(back.audio?.durationMs, 65000);
    final transcription = back.audio?.transcription;
    expect(transcription, isA<TranscriptionDone>());
    expect((transcription! as TranscriptionDone).model, 'hohe');
  });

  test('notes load most recently edited first', () async {
    final older = Note.create(text: 'older', now: at);
    final newer = Note.create(text: 'newer', now: at.add(const Duration(hours: 1)));
    await saveOk(older);
    await saveOk(newer);

    expect(loaded(await repo.loadAll()).map((note) => note.id), [newer.id, older.id]);
  });

  test('the file keeps the desktop layout: a version and the note', () async {
    final note = Note.create(text: 'x', now: at);
    await saveOk(note);

    final json = jsonDecode(await File(p.join(dir.path, '${note.id}.json')).readAsString()) as Map<String, Object?>;
    expect(json['version'], 1);
    expect((json['note']! as Map<String, Object?>)['id'], note.id);
  });

  test('a save replaces the file whole and leaves no temp file', () async {
    final note = Note.create(text: 'first', now: at);
    await saveOk(note);
    await saveOk(note.copyWith(text: 'second'));

    expect(fileNames(), ['${note.id}.json']);
    expect(loaded(await repo.loadAll()).single.text, 'second');
  });

  test('saves made at once land in the order they were made', () async {
    final note = Note.create(text: '0', now: at);
    final saves = [for (var i = 1; i <= 20; i++) repo.save(note.copyWith(text: '$i'))];
    final results = await Future.wait(saves);

    expect(results, everyElement(isA<Ok<void>>()));
    expect(loaded(await repo.loadAll()).single.text, '20');
    expect(fileNames(), ['${note.id}.json']);
  });

  test('a temp file from an interrupted save is ignored, then swept on the next open', () async {
    final note = Note.create(text: 'kept', now: at);
    await saveOk(note);
    await File(p.join(dir.path, '${note.id}.json.tmp')).writeAsString('{"version": 1, "note": {"id": "torn');

    expect(loaded(await repo.loadAll()).single.text, 'kept');

    await NotesRepo.open(dir);
    expect(fileNames(), ['${note.id}.json']);
  });

  test('unreadable or foreign files are skipped, not fatal', () async {
    final good = Note.create(text: 'good', now: at);
    await saveOk(good);
    final other = Note.create(text: 'moved', now: at);
    final strayId = newNoteId();
    await File(p.join(dir.path, '${newNoteId()}.json')).writeAsString('not json at all');
    await File(p.join(dir.path, '${newNoteId()}.json')).writeAsString('{"version": 1, "note": {"id": 3}}');
    await File(p.join(dir.path, '${newNoteId()}.json')).writeAsString('{"version": 2, "note": {}}');
    await File(p.join(dir.path, '${newNoteId()}.json')).writeAsString('[1, 2, 3]');
    await File(p.join(dir.path, '$strayId.json')).writeAsString(jsonEncode({'version': 1, 'note': other.toJson()}));
    await File(p.join(dir.path, 'notes.json')).writeAsString(jsonEncode({'version': 1, 'note': other.toJson()}));
    await File(p.join(dir.path, '${newNoteId()}.wav')).writeAsBytes([0, 1, 2]);

    final notes = loaded(await repo.loadAll());
    expect(notes.map((note) => note.id), [good.id]);
  });

  test('a damaged note file is skipped, not fatal to the whole list', () async {
    final good = Note.create(text: 'good', now: at);
    await saveOk(good);
    // A duration too big for an int (1e400 decodes as infinity), and bytes that aren't UTF-8.
    final huge = Note.create(
      now: at,
      audio: const NoteAudio(durationMs: 1, transcription: TranscriptionPending()),
    );
    final hugeJson = jsonEncode({'version': 1, 'note': huge.toJson()})
        .replaceFirst('"durationMs":1', '"durationMs":1e400');
    await File(p.join(dir.path, '${huge.id}.json')).writeAsString(hugeJson);
    await File(p.join(dir.path, '${newNoteId()}.json')).writeAsBytes([0x7b, 0xff, 0xfe, 0x7d]);

    final notes = loaded(await repo.loadAll());
    expect(notes.map((note) => note.id), [good.id]);
  });

  test('delete removes the note and its recording', () async {
    final note = Note.create(
      text: '',
      audio: const NoteAudio(durationMs: 1000, transcription: TranscriptionPending()),
      now: at,
    );
    final kept = Note.create(text: 'kept', now: at);
    await saveOk(note);
    await saveOk(kept);
    await File(repo.audioPath(note.id)).writeAsBytes(List<int>.filled(44, 0));
    expect(await repo.hasAudio(note.id), isTrue);

    expect(await repo.delete(note.id), isA<Ok<void>>());

    expect(await repo.hasAudio(note.id), isFalse);
    expect(fileNames(), ['${kept.id}.json']);
    expect(loaded(await repo.loadAll()).map((n) => n.id), [kept.id]);
  });

  test('deleting a note that is already gone succeeds', () async {
    expect(await repo.delete(newNoteId()), isA<Ok<void>>());
  });

  test('an id that is not a note id never becomes a path', () async {
    final bad = Note(id: '../escape', createdAt: at, updatedAt: at, text: 'x');

    expect(await repo.save(bad), isA<Err<void>>());
    expect(await repo.delete('../escape'), isA<Err<void>>());
    expect(await repo.hasAudio('../escape'), isFalse);
    expect(() => repo.audioPath('../escape'), throwsArgumentError);
    expect(() => repo.audioPath(newNoteId().toUpperCase()), throwsArgumentError);
    expect(fileNames(), isEmpty);
    expect(File(p.join(dir.parent.path, 'escape.json')).existsSync(), isFalse);
  });

  test('text over the limit is refused and the saved version kept', () async {
    final note = Note.create(text: 'short', now: at);
    await saveOk(note);

    final result = await repo.save(note.copyWith(text: 'a' * (maxNoteTextLength + 1)));

    expect(result, isA<Err<void>>());
    expect((result as Err<void>).message, NotesRepoError.tooLong);
    expect(loaded(await repo.loadAll()).single.text, 'short');
  });

  test('the recording sits beside the note file', () async {
    final id = newNoteId();
    expect(repo.audioPath(id), p.join(dir.path, '$id.wav'));
    expect(await repo.hasAudio(id), isFalse);
  });
}
