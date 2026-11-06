import 'dart:io';

import 'package:nota/core/result.dart';
import 'package:nota/features/notes/data/note.dart';
import 'package:nota/features/notes/data/notes_repo.dart';

/// Notes kept in memory, for widget tests: real file writes don't finish
/// inside a widget test's fake clock. Saves and deletes complete at once.
class MemoryNotesRepo implements NotesRepo {
  MemoryNotesRepo([Iterable<Note> notes = const []]) {
    for (final note in notes) {
      saved[note.id] = note;
    }
  }

  /// What has been saved, by id.
  final saved = <String, Note>{};

  /// Set to make every save fail.
  bool failSaves = false;

  /// Set to make every delete fail.
  bool failDeletes = false;

  @override
  Directory get directory => Directory.systemTemp;

  @override
  Future<Result<List<Note>>> loadAll() async => Ok(saved.values.toList());

  @override
  Future<Result<void>> save(Note note) async {
    if (failSaves) return const Err(NotesRepoError.saveFailed);
    saved[note.id] = note;
    return const Ok(null);
  }

  @override
  Future<Result<void>> delete(String id) async {
    if (failDeletes) return const Err(NotesRepoError.deleteFailed);
    saved.remove(id);
    return const Ok(null);
  }

  @override
  String audioPath(String id) => '${Directory.systemTemp.path}/$id.wav';

  @override
  Future<bool> hasAudio(String id) async => false;
}
