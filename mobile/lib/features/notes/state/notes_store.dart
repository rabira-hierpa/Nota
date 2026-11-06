import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/result.dart';
import '../../settings/settings_store.dart';
import '../data/note.dart';
import '../data/notes_repo.dart';
import '../logic/search.dart';
import '../logic/sections.dart';
import '../logic/suggest_tags.dart' as suggest;
import '../logic/tags.dart';

/// Why a change didn't reach the disk. The interface words each one; none
/// carries a note's text.
enum NotesFailure { load, save, tooLong, delete }

/// Every note, and what the note list shows of them: the chosen section, the
/// search, and the order from Settings. Changes apply in memory at once (so
/// the list and an open editor agree), then go to [NotesRepo]; a write that
/// fails is reported on [failures].
class NotesStore extends ChangeNotifier {
  NotesStore._(this._repo, List<Note> notes, {required this._loadFailed, this._settings})
    : _sortOrder = _settings?.sortOrder ?? SortOrder.edited {
    _replaceAll(notes);
    _settings?.addListener(_followSettings);
  }

  /// Reads every note from [repo]. With [settings], the list follows the sort
  /// order chosen there. A library that can't be read opens empty, with
  /// [loadFailed] set, so the app still starts and can try again.
  static Future<NotesStore> open(NotesRepo repo, {SettingsStore? settings}) async {
    final result = await repo.loadAll();
    return NotesStore._(
      repo,
      result.valueOrNull ?? const [],
      loadFailed: result is Err<List<Note>>,
      settings: settings,
    );
  }

  final NotesRepo _repo;
  final SettingsStore? _settings;
  final _entries = <String, IndexedNote>{};
  final _textReplaced = StreamController<String>.broadcast();
  final _failures = StreamController<NotesFailure>.broadcast();

  bool _loadFailed;
  NoteSection _section = NoteSection.all;
  String _query = '';
  SearchQuery _search = const SearchQuery();
  SortOrder _sortOrder;

  List<Note>? _all;
  List<Note>? _visible;
  SectionCounts? _counts;
  List<TagNode>? _tagTree;

  /// True when the last attempt to read the notes failed.
  bool get loadFailed => _loadFailed;

  /// Every note, the Trash and the Archive included.
  List<Note> get all => _all ??= List.unmodifiable([for (final entry in _entries.values) entry.note]);

  Note? byId(String id) => _entries[id]?.note;

  NoteSection get section => _section;

  set section(NoteSection section) {
    if (section == _section) return;
    _section = section;
    _visible = null;
    notifyListeners();
  }

  /// What is typed in the search field, as typed.
  String get query => _query;

  set query(String query) {
    if (query == _query) return;
    _query = query;
    _search = parseSearch(query);
    _visible = null;
    notifyListeners();
  }

  /// [query], parsed: its words (for highlighting matches) and its `#tags`.
  SearchQuery get search => _search;

  SortOrder get sortOrder => _sortOrder;

  /// Without [SettingsStore], the order is set here; with it, Settings sets it.
  set sortOrder(SortOrder order) {
    if (order == _sortOrder) return;
    _sortOrder = order;
    _visible = null;
    notifyListeners();
  }

  /// The note list: the section's notes that match the search, pinned first.
  List<Note> get visible => _visible ??= notesInSection(_entries.values.toList(), _section, _search, sort: _sortOrder);

  /// How many notes each fixed section holds, for the drawer.
  SectionCounts get counts => _counts ??= countSections(_entries.values.toList());

  /// The drawer's tags, from every note outside the Trash.
  List<TagNode> get tagTree => _tagTree ??= buildTagTree([
    for (final entry in _entries.values)
      if (!entry.note.isTrashed) entry.tags,
  ]);

  /// What tag suggestions compare a note with.
  List<suggest.TaggedText> get taggedTexts => suggest.taggedTexts(_entries.values.toList());

  /// Ids of notes whose text changed from outside the editor (a transcription),
  /// so an open editor reloads it.
  Stream<String> get textReplaced => _textReplaced.stream;

  /// Writes that failed, for the interface to report.
  Stream<NotesFailure> get failures => _failures.stream;

  /// Where a note's recording lives (or will).
  String audioPath(String id) => _repo.audioPath(id);

  /// Reads the notes again, after a failed load.
  Future<void> reload() async {
    final result = await _repo.loadAll();
    switch (result) {
      case Ok(:final value):
        _loadFailed = false;
        _replaceAll(value);
      case Err():
        _loadFailed = true;
        _report(NotesFailure.load);
    }
    _changed();
  }

  /// A new note, saved at once (empty unless [text] is given).
  Future<Note> create({String text = ''}) async {
    final note = Note.create(text: text);
    _put(note);
    await _save(note);
    return note;
  }

  /// Adds a note made elsewhere, e.g. a voice note whose WAV is already at [audioPath].
  Future<void> add(Note note) async {
    _put(note);
    await _save(note);
  }

  /// Replaces the note's text, as typed; marks it edited now.
  Future<void> updateText(String id, String text) =>
      _change(id, (note) => note.text == text ? null : note.copyWith(text: text, updatedAt: DateTime.now()));

  /// Records what the speech model did with the note's recording. [text],
  /// when given, replaces the note's text, and an open editor is told.
  Future<void> setTranscription(String id, Transcription transcription, {String? text}) async {
    final changed = _change(id, (note) {
      final audio = note.audio?.withTranscription(transcription);
      final edited = text != null && text != note.text;
      return note.copyWith(audio: audio, text: text, updatedAt: edited ? DateTime.now() : null);
    });
    if (text != null) _textReplaced.add(id);
    await changed;
  }

  /// Keeps a recording with the note, e.g. after dictating into it.
  Future<void> attachAudio(String id, NoteAudio audio) => _change(id, (note) => note.copyWith(audio: audio));

  Future<void> favorite(String id, {bool value = true}) =>
      _change(id, (note) => note.favorite == value ? null : note.copyWith(favorite: value), revert: true);

  Future<void> pin(String id, {bool value = true}) =>
      _change(id, (note) => note.pinned == value ? null : note.copyWith(pinned: value), revert: true);

  Future<void> archive(String id) =>
      _change(id, (note) => note.isArchived ? null : note.copyWith(archivedAt: DateTime.now()), revert: true);

  Future<void> unarchive(String id) =>
      _change(id, (note) => note.isArchived ? note.copyWith(clearArchivedAt: true) : null, revert: true);

  Future<void> trash(String id) =>
      _change(id, (note) => note.isTrashed ? null : note.copyWith(trashedAt: DateTime.now()), revert: true);

  Future<void> restore(String id) =>
      _change(id, (note) => note.isTrashed ? note.copyWith(clearTrashedAt: true) : null, revert: true);

  /// Removes the note and its recording from the phone.
  Future<void> deleteForever(String id) async {
    if (!await _delete(id)) _report(NotesFailure.delete);
  }

  /// Deletes every note in the Trash for good.
  Future<void> emptyTrash() async {
    final trashed = [
      for (final entry in _entries.values)
        if (entry.note.isTrashed) entry.note.id,
    ];
    final deleted = await Future.wait(trashed.map(_delete));
    if (deleted.contains(false)) _report(NotesFailure.delete);
  }

  /// Takes the note out of memory first, so nothing that arrives while the
  /// disk is busy (a transcription, a late edit) can write it back, then
  /// deletes its files. A delete that fails puts the note back.
  Future<bool> _delete(String id) async {
    final entry = _entries.remove(id);
    if (entry == null) return true;
    _changed();
    switch (await _repo.delete(id)) {
      case Ok():
        return true;
      case Err():
        _entries.putIfAbsent(id, () => entry);
        _changed();
        return false;
    }
  }

  @override
  void dispose() {
    _settings?.removeListener(_followSettings);
    unawaited(_textReplaced.close());
    unawaited(_failures.close());
    super.dispose();
  }

  void _followSettings() {
    final settings = _settings;
    if (settings != null) sortOrder = settings.sortOrder;
  }

  void _replaceAll(List<Note> notes) {
    _entries
      ..clear()
      ..addEntries(indexNotes(notes).map((entry) => MapEntry(entry.note.id, entry)));
  }

  /// Puts [note] in memory, reusing its tags when the text is unchanged.
  void _put(Note note) {
    final old = _entries[note.id];
    final tags = old != null && old.note.text == note.text ? old.tags : extractTags(note.text);
    _entries[note.id] = IndexedNote(note, tags);
    _changed();
  }

  /// Applies [edit] to the note in memory now, then saves it. [edit] returns
  /// null when nothing changes. With [revert], a failed save puts the note
  /// back as it was, unless something changed it again meanwhile.
  Future<void> _change(String id, Note? Function(Note note) edit, {bool revert = false}) async {
    final before = _entries[id]?.note;
    if (before == null) return;
    final after = edit(before);
    if (after == null) return;
    _put(after);
    final saved = await _save(after);
    if (!saved && revert && identical(_entries[id]?.note, after)) _put(before);
  }

  Future<bool> _save(Note note) async {
    switch (await _repo.save(note)) {
      case Ok():
        return true;
      case Err(:final message):
        _report(message == NotesRepoError.tooLong ? NotesFailure.tooLong : NotesFailure.save);
        return false;
    }
  }

  void _report(NotesFailure failure) {
    if (!_failures.isClosed) _failures.add(failure);
  }

  void _changed() {
    _all = null;
    _visible = null;
    _counts = null;
    _tagTree = null;
    notifyListeners();
  }
}
