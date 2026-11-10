import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/result.dart';
import 'note.dart';

/// Generic failures [NotesRepo] returns. They never name a note or quote its
/// text; the store shows its own words for them.
abstract final class NotesRepoError {
  static const readFailed = "Couldn't read the notes.";
  static const saveFailed = "Couldn't save the note.";
  static const deleteFailed = "Couldn't delete the note.";
  static const tooLong = 'The note is too long to save.';
  static const invalidId = 'That note id is not valid.';
}

/// Notes on the phone, as the desktop keeps them: one JSON file per note
/// (`<id>.json`, holding `{"version": 1, "note": …}`) and, for a voice note,
/// its recording beside it as `<id>.wav`. Writes run one at a time, so a
/// transcription finishing while the person types can't tear a file.
class NotesRepo {
  NotesRepo._(this.directory);

  /// The repo in [dir], or in the app's support folder under `notes/`.
  /// Clears temp files a crash may have left behind. A folder that can't be
  /// made doesn't stop the app: reading it then fails, and the note list
  /// says so and offers to try again.
  static Future<NotesRepo> open([Directory? dir]) async {
    final directory = dir ?? Directory(p.join((await getApplicationSupportDirectory()).path, 'notes'));
    try {
      await directory.create(recursive: true);
    } on FileSystemException {
      // Reported through loadAll.
    }
    final repo = NotesRepo._(directory);
    await repo._removeTempFiles();
    return repo;
  }

  static const _noteExtension = '.json';
  static const _audioExtension = '.wav';
  static const _tempExtension = '.tmp';
  static const _fileVersion = 1;

  /// A note file bigger than this can't be one Nota wrote (text is capped at
  /// [maxNoteTextLength] characters, at most 4 UTF-8 bytes each), so it isn't read.
  static const _maxFileBytes = maxNoteTextLength * 4 + 64 * 1024;

  /// The lowercase v4-style UUID [newNoteId] makes; nothing else becomes a path.
  static final _idPattern = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

  final Directory directory;
  Future<void> _queue = Future.value();

  /// Whether [id] has the shape of a note id, and so is safe in a file name.
  static bool isValidId(String id) => _idPattern.hasMatch(id);

  /// Every note that could be read, most recently edited first. Files that
  /// can't be read or don't hold a valid note are skipped, not fatal.
  Future<Result<List<Note>>> loadAll() => _exclusive(() async {
    final List<File> files;
    try {
      // Made again here in case opening couldn't, so trying again can help.
      await directory.create(recursive: true);
      files = await directory
          .list()
          .where((entity) => entity is File && entity.path.endsWith(_noteExtension))
          .cast<File>()
          .toList();
    } on FileSystemException {
      return const Err(NotesRepoError.readFailed);
    }
    final notes = await Future.wait(files.map(_readNote));
    final readable = notes.nonNulls.toList()..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return Ok(readable);
  });

  /// Writes [note] whole: to a temp file first, then renamed over the old
  /// one, so a crash mid-write leaves the previous version intact.
  Future<Result<void>> save(Note note) => _exclusive(() async {
    if (!isValidId(note.id)) return const Err(NotesRepoError.invalidId);
    if (note.text.length > maxNoteTextLength) return const Err(NotesRepoError.tooLong);
    final target = _notePath(note.id);
    final temp = File('$target$_tempExtension');
    try {
      final json = jsonEncode({'version': _fileVersion, 'note': note.toJson()});
      await temp.writeAsString(json, flush: true);
      await temp.rename(target);
      return const Ok(null);
    } on FileSystemException {
      await _tryDelete(temp.path);
      return const Err(NotesRepoError.saveFailed);
    }
  });

  /// Removes the note and its recording for good. The note file goes last:
  /// if anything fails before it, the note is still there to delete again,
  /// rather than a recording left behind that nothing lists.
  Future<Result<void>> delete(String id) => _exclusive(() async {
    if (!isValidId(id)) return const Err(NotesRepoError.invalidId);
    try {
      await _deleteIfThere('${_notePath(id)}$_tempExtension');
      await _deleteIfThere(audioPath(id));
      await _deleteIfThere(_notePath(id));
      return const Ok(null);
    } on FileSystemException {
      return const Err(NotesRepoError.deleteFailed);
    }
  });

  /// Where the note's recording lives (or will). Throws [ArgumentError] for
  /// an id that isn't a note id, so no other path can be built from one.
  String audioPath(String id) {
    if (!isValidId(id)) throw ArgumentError.value(id, 'id', 'not a note id');
    return p.join(directory.path, '$id$_audioExtension');
  }

  /// Whether the note's recording is on disk.
  Future<bool> hasAudio(String id) async {
    if (!isValidId(id)) return false;
    return File(audioPath(id)).exists();
  }

  String _notePath(String id) => p.join(directory.path, '$id$_noteExtension');

  /// The note in [file], or null when it can't be read or isn't a valid note
  /// whose id matches its file name.
  Future<Note?> _readNote(File file) async {
    final id = p.basenameWithoutExtension(file.path);
    if (!isValidId(id)) return null;
    try {
      if (await file.length() > _maxFileBytes) return null;
      final note = _parse(await file.readAsString());
      return note != null && note.id == id && note.text.length <= maxNoteTextLength ? note : null;
    } on FileSystemException {
      return null;
    }
  }

  static Note? _parse(String raw) {
    try {
      final json = jsonDecode(raw);
      if (json is! Map<String, Object?> || json['version'] != _fileVersion) return null;
      final note = json['note'];
      return note is Map<String, Object?> ? Note.fromJson(note) : null;
    } on FormatException {
      return null;
    } on TypeError {
      // A field missing or of the wrong type fails a cast in Note.fromJson.
      return null;
    } on UnsupportedError {
      // A number too big for an int (1e400 decodes as infinity) fails toInt.
      return null;
    }
  }

  Future<void> _removeTempFiles() async {
    try {
      await for (final entity in directory.list()) {
        if (entity is File && entity.path.endsWith(_tempExtension)) await _tryDelete(entity.path);
      }
    } on FileSystemException {
      // Leftovers are harmless: loadAll never reads them.
    }
  }

  /// Cleanup that may fail without anyone needing to know.
  static Future<void> _tryDelete(String path) async {
    try {
      await File(path).delete();
    } on FileSystemException {
      // Left for the next launch's sweep.
    }
  }

  static Future<void> _deleteIfThere(String path) async {
    try {
      await File(path).delete();
    } on PathNotFoundException {
      // Already gone.
    }
  }

  /// Runs [task] after every task queued before it, whether they failed or not.
  Future<T> _exclusive<T>(Future<T> Function() task) {
    final run = _queue.then((_) => task());
    _queue = run.then<void>((_) {}, onError: (Object _) {});
    return run;
  }
}
