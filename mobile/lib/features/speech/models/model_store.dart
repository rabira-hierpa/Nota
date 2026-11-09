import 'dart:async';
import 'dart:io';
import 'dart:isolate';

import 'package:crypto/crypto.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/device.dart';
import '../../../core/result.dart';
import '../hohe/model_files.dart';

/// A model file's expected size and SHA-256, as in [ModelFiles.expected].
typedef ExpectedFile = ({int bytes, String sha256});

/// Where the model files can be downloaded from: Nota's Cloudflare R2 bucket
/// (`nota-models`), one folder per set of files, since [ModelFiles.expected]
/// pins each file's hash. A build can point elsewhere with
/// `--dart-define=NOTA_MODELS_URL=…`, or offer no download with an empty one.
const _modelsUrl = String.fromEnvironment('NOTA_MODELS_URL', defaultValue: 'https://models.nota.et/v1/');

/// A download or copy is written here first and renamed once checked, so a
/// half-written file never passes for a model.
const _partExtension = '.part';

/// The OS error for a full disk (ENOSPC on Android and iOS alike).
const _noSpaceError = 28;

/// Progress is reported at most this often, so a 700 MB copy doesn't rebuild
/// the screen for every 64 KB chunk.
const _progressStep = 1 << 22;

/// Failures [ModelStore] returns: generic, never a path. The screen words
/// them from [ModelStore.notice], which also names the file.
abstract final class ModelStoreError {
  static const busy = 'The speech models are busy.';
  static const notModelFile = "That isn't a speech model file.";
  static const wrongFile = "A model file doesn't match the expected one.";
  static const copyFailed = "Couldn't copy the model file.";
  static const noSpace = 'Not enough free space for the model.';
  static const noDownload = 'No download is set up.';
  static const downloadFailed = 'The download stopped.';
  static const downloadNoMatch = "A downloaded file didn't match the expected one.";
  static const downloadStopped = 'The download was stopped.';
  static const deleteFailed = "Couldn't delete the model files.";
}

enum ModelFileState { ready, missing, wrongSize }

/// One model file on the phone, by size only (hashing 700 MB on every launch
/// would take seconds; imports and downloads are hashed once, when added).
final class ModelFileStatus {
  const ModelFileStatus({required this.name, required this.state, required this.expectedBytes});

  final String name;
  final ModelFileState state;
  final int expectedBytes;
}

enum ModelReadiness { missing, partial, ready }

/// Which model files are in place.
final class ModelStatus {
  const ModelStatus(this.files);

  final List<ModelFileStatus> files;

  ModelReadiness get readiness {
    if (files.every((file) => file.state == ModelFileState.ready)) return ModelReadiness.ready;
    if (files.every((file) => file.state == ModelFileState.missing)) return ModelReadiness.missing;
    return ModelReadiness.partial;
  }

  bool get isReady => readiness == ModelReadiness.ready;

  /// Files not on the phone at all.
  List<String> get missing => _named(ModelFileState.missing);

  /// Files there but of the wrong size: cut off, damaged, or another version.
  List<String> get wrongSize => _named(ModelFileState.wrongSize);

  /// Whether any model file (right or wrong) is on the phone.
  bool get hasAny => files.any((file) => file.state != ModelFileState.missing);

  List<String> _named(ModelFileState state) => [
    for (final file in files)
      if (file.state == state) file.name,
  ];
}

enum ModelTaskKind { picking, copying, checking, downloading, deleting }

/// What the store is doing now. [done] and [total] are bytes, while copying
/// one file or downloading all of them.
final class ModelTask {
  const ModelTask(this.kind, {this.file, this.done = 0, this.total = 0});

  final ModelTaskKind kind;
  final String? file;
  final int done;
  final int total;

  /// Share done, or null when there is nothing to measure.
  double? get fraction => total > 0 ? (done / total).clamp(0, 1).toDouble() : null;
}

enum ModelNoticeKind {
  imported,
  notModelFile,
  wrongFile,
  copyFailed,
  noSpace,
  downloaded,
  downloadFailed,
  downloadNoMatch,
  downloadStopped,
  deleted,
  deleteFailed,
}

/// How the last import, download or delete went, for the screen to word.
/// [file] is the file it was about; [count] the files added.
final class ModelNotice {
  const ModelNotice(this.kind, {this.file, this.count = 0});

  final ModelNoticeKind kind;
  final String? file;
  final int count;

  bool get isProblem => switch (kind) {
    ModelNoticeKind.imported || ModelNoticeKind.downloaded || ModelNoticeKind.deleted => false,
    _ => true,
  };
}

/// Picks files with the system picker; replaced in tests.
typedef PickFiles = Future<List<PlatformFile>> Function();

Future<List<PlatformFile>> _pickWithSystem() => FilePicker.pickFiles();

/// Collects the one digest a chunked hash produces.
final class _DigestSink implements Sink<Digest> {
  Digest? value;

  @override
  void add(Digest data) => value = data;

  @override
  void close() {}
}

/// The SHA-256 of the file at [path], read in chunks (the largest model file
/// is 723 MB: it is never held in memory whole).
Future<String> _sha256Streamed(String path) async {
  final sink = _DigestSink();
  final input = sha256.startChunkedConversion(sink);
  await for (final chunk in File(path).openRead()) {
    input.add(chunk);
  }
  input.close();
  return sink.value.toString();
}

/// Hashes on another isolate, so the screen keeps its frames.
Future<String> sha256OfFile(String path) => Isolate.run(() => _sha256Streamed(path));

/// The four speech model files on the phone: what is there, and adding them
/// (picked from the phone's files, downloaded, or copied over a cable into
/// [directory]) or deleting them. One task runs at a time.
class ModelStore extends ChangeNotifier {
  ModelStore._(
    this._directory, {
    required this._expected,
    required this._downloadUrl,
    required this._client,
    required this._pick,
    required this._pickerFolders,
    this._ownFolder = false,
  }) : _status = ModelStatus([
         for (final MapEntry(key: name, value: file) in _expected.entries)
           ModelFileStatus(name: name, state: ModelFileState.missing, expectedBytes: file.bytes),
       ]);

  /// The store for the phone's models folder (Android: the app's external
  /// files, which adb and a USB cable can reach without any permission; iOS:
  /// Documents, which Finder and the Files app show), checked once.
  /// The named arguments are for tests; [pickerFolders] are where the
  /// picker leaves its copies of picked files.
  static Future<ModelStore> open({
    Directory? directory,
    Map<String, ExpectedFile> expected = ModelFiles.expected,
    String downloadUrl = _modelsUrl,
    http.Client Function()? client,
    PickFiles? pick,
    List<String>? pickerFolders,
  }) async {
    final dir = directory ?? await _platformDirectory();
    final store = ModelStore._(
      dir,
      expected: expected,
      downloadUrl: downloadUrl,
      client: client ?? http.Client.new,
      pick: pick ?? _pickWithSystem,
      pickerFolders: pickerFolders ?? (directory == null ? await _temporaryFolders() : const []),
      ownFolder: directory == null,
    );
    try {
      await dir.create(recursive: true);
    } on FileSystemException {
      // Reported as missing files; adding them tries again.
    }
    // The models (840 MB, and easy to add again) stay out of iCloud and
    // computer backups; iOS applies the flag to what is put in the folder
    // later too. Notes are backed up as usual. Tests pass their own folder.
    if (directory == null) await Device.excludeFromBackup(dir.path);
    await store.refresh();
    // An import cut short when Nota was closed may have left the picker's
    // copy in the cache (Android). iOS empties its own tmp, and there the
    // picker's clearing would empty all of it.
    if (directory == null && Platform.isAndroid) unawaited(store._clearPickerCopies());
    return store;
  }

  /// The app's temporary folders: the picker copies picked files there (iOS
  /// into tmp, Android into the cache), and those copies are Nota's to move.
  static Future<List<String>> _temporaryFolders() async => [
    Directory.systemTemp.path,
    (await getTemporaryDirectory()).path,
  ];

  static Future<Directory> _platformDirectory() async {
    if (Platform.isAndroid) {
      final external = await getExternalStorageDirectory();
      if (external != null) return Directory(p.join(external.path, 'models'));
    }
    return Directory(p.join((await getApplicationDocumentsDirectory()).path, 'models'));
  }

  final Directory _directory;
  final Map<String, ExpectedFile> _expected;
  final String _downloadUrl;
  final http.Client Function() _client;
  final PickFiles _pick;
  final List<String> _pickerFolders;

  /// The phone's own models folder, kept out of backups (tests pass their own).
  final bool _ownFolder;

  ModelStatus _status;
  ModelTask? _task;
  ModelNotice? _notice;
  http.Client? _download;
  bool _stopping = false;

  /// The folder the model files live in.
  String get directory => _directory.path;

  ModelStatus get status => _status;

  /// What the store is busy with, or null.
  ModelTask? get task => _task;

  /// How the last import, download or delete went, until [clearNotice].
  ModelNotice? get notice => _notice;

  /// All the model files together, in bytes (about 840 MB).
  int get totalBytes => _expected.values.fold(0, (sum, file) => sum + file.bytes);

  /// The expected size of each file, by name.
  int expectedBytes(String name) => _expected[name]?.bytes ?? 0;

  /// Only when the build names a place to download from.
  bool get canDownload => _downloadUrl.isNotEmpty;

  /// The share of the download done, while downloading.
  double? get downloadProgress => _task?.kind == ModelTaskKind.downloading ? _task?.fraction : null;

  void clearNotice() {
    if (_notice == null) return;
    _notice = null;
    notifyListeners();
  }

  /// Looks at the files again (sizes only), e.g. after copying them over a cable.
  Future<void> refresh() async {
    await _adoptStrayFiles();
    _status = ModelStatus([
      for (final MapEntry(key: name, value: file) in _expected.entries)
        ModelFileStatus(name: name, state: await _stateOf(name, file.bytes), expectedBytes: file.bytes),
    ]);
    notifyListeners();
  }

  /// Lets the person pick files (any type, several at once) and copies each
  /// model file among them into [directory], checking its SHA-256. A file is
  /// known by its name, or by its exact size when a browser renamed it.
  Future<Result<void>> importFiles() async {
    if (_task != null) return const Err(ModelStoreError.busy);
    _setTask(const ModelTask(ModelTaskKind.picking));
    var picked = const <PlatformFile>[];
    try {
      try {
        picked = await _pick();
      } on Exception {
        return _fail(const ModelNotice(ModelNoticeKind.copyFailed), ModelStoreError.copyFailed);
      }
      if (picked.isEmpty) return const Ok(null);
      return await _importPicked(picked);
    } finally {
      // The picker's copies (up to 723 MB each) go, whatever became of them.
      for (final file in picked) {
        if (_isPickerCopy(file.path)) await _deleteQuietly(file.path!);
      }
      await _clearPickerCopies();
      _setTask(null);
      await refresh();
    }
  }

  /// Downloads each file not yet in place, resuming a stopped download, and
  /// checks its SHA-256 before it counts.
  Future<Result<void>> download() async {
    if (!canDownload) return const Err(ModelStoreError.noDownload);
    if (_task != null) return const Err(ModelStoreError.busy);
    // Busy from here, so no import starts while the files are looked at.
    _setTask(const ModelTask(ModelTaskKind.downloading));
    await refresh();
    final needed = [
      for (final file in _status.files)
        if (file.state != ModelFileState.ready) file.name,
    ];
    final total = needed.fold(0, (sum, name) => sum + _expected[name]!.bytes);
    var before = 0;
    final client = _download = _client();
    _stopping = false;
    _setTask(ModelTask(ModelTaskKind.downloading, total: total));
    try {
      for (final name in needed) {
        final problem = await _downloadOne(client, name, (got) {
          _setTask(ModelTask(ModelTaskKind.downloading, file: name, done: before + got, total: total));
        });
        if (problem != null) return _fail(ModelNotice(problem, file: name), _downloadError(problem));
        before += _expected[name]!.bytes;
      }
      _notice = ModelNotice(ModelNoticeKind.downloaded, count: needed.length);
      return const Ok(null);
    } finally {
      client.close();
      _download = null;
      _setTask(null);
      await refresh();
    }
  }

  /// Stops a download; what has arrived is kept, and the next one resumes it.
  void stopDownload() {
    if (_download == null) return;
    _stopping = true;
    _download?.close();
  }

  /// Deletes the model files, any half-copied ones, and whole ones left one
  /// folder up, which the next look would otherwise move back in.
  Future<Result<void>> delete() async {
    if (_task != null) return const Err(ModelStoreError.busy);
    _setTask(const ModelTask(ModelTaskKind.deleting));
    try {
      for (final MapEntry(key: name, value: file) in _expected.entries) {
        await _deleteIfThere(p.join(directory, name));
        await _deleteIfThere(_partPath(name));
        if (await _isWholeStray(name, file.bytes)) await _deleteIfThere(_strayPath(name));
      }
      _notice = const ModelNotice(ModelNoticeKind.deleted);
      return const Ok(null);
    } on FileSystemException {
      return _fail(const ModelNotice(ModelNoticeKind.deleteFailed), ModelStoreError.deleteFailed);
    } finally {
      _setTask(null);
      await refresh();
    }
  }

  @override
  void dispose() {
    _download?.close();
    super.dispose();
  }

  /// Copies every model file among [picked]; a file that fails doesn't stop
  /// the others, and the first failure is the one reported.
  Future<Result<void>> _importPicked(List<PlatformFile> picked) async {
    var added = 0;
    ModelNotice? problem;
    for (final file in picked) {
      final name = _targetName(file);
      final failure = name == null ? ModelNoticeKind.notModelFile : await _importOne(file, name);
      if (failure == null) {
        added++;
      } else {
        problem ??= ModelNotice(failure, file: file.name);
      }
    }
    if (problem != null) {
      return _fail(ModelNotice(problem.kind, file: problem.file, count: added), _importError(problem.kind));
    }
    _notice = ModelNotice(ModelNoticeKind.imported, count: added);
    return const Ok(null);
  }

  /// Which model file [file] is: by name, or else by its exact size.
  String? _targetName(PlatformFile file) {
    if (_expected.containsKey(file.name)) return file.name;
    final size = file.lengthSync();
    if (size == null) return null;
    for (final MapEntry(key: name, value: expected) in _expected.entries) {
      if (expected.bytes == size) return name;
    }
    return null;
  }

  /// Copies one picked file in as [name]; returns what went wrong, or null.
  Future<ModelNoticeKind?> _importOne(PlatformFile file, String name) async {
    final part = File(_partPath(name));
    final path = file.path;
    final pickerCopy = _isPickerCopy(path);
    if (pickerCopy && await _moveInto(path!, part)) return _checkAndKeep(part, name, ModelNoticeKind.wrongFile);
    final problem = await _copyInto(path != null ? File(path).openRead() : file.readAsByteStream(), part, name);
    // The picker's copy (up to 723 MB) isn't needed any more: gone before the check, so the disk holds one copy.
    if (pickerCopy) await _deleteQuietly(path!);
    return problem ?? await _checkAndKeep(part, name, ModelNoticeKind.wrongFile);
  }

  /// Whether [path] is a copy the picker made (on Android it copies every
  /// picked file into the cache), as opposed to the person's own file.
  bool _isPickerCopy(String? path) => path != null && _pickerFolders.any((folder) => p.isWithin(folder, path));

  /// Moves the picker's own copy into place: instant, and no second copy on
  /// disk, when both are on one volume (iOS). False when they aren't (Android).
  static Future<bool> _moveInto(String path, File part) async {
    try {
      await File(path).rename(part.path);
      return true;
    } on FileSystemException {
      return false;
    }
  }

  /// Streams a picked file into [part]; returns what went wrong, or null.
  Future<ModelNoticeKind?> _copyInto(Stream<List<int>> source, File part, String name) async {
    final total = _expected[name]!.bytes;
    try {
      await _write(source, part, FileMode.write, (done) {
        _setTask(ModelTask(ModelTaskKind.copying, file: name, done: done, total: total));
      });
      return null;
    } on FileSystemException catch (error) {
      await _deleteQuietly(part.path);
      return _isNoSpace(error) ? ModelNoticeKind.noSpace : ModelNoticeKind.copyFailed;
    } on Exception {
      await _deleteQuietly(part.path);
      return ModelNoticeKind.copyFailed;
    }
  }

  /// Downloads one file to its `.part` (continuing one already begun);
  /// returns what went wrong, or null.
  Future<ModelNoticeKind?> _downloadOne(http.Client client, String name, void Function(int got) onBytes) async {
    final expected = _expected[name]!;
    final part = File(_partPath(name));
    var have = await _lengthOrZero(part);
    if (have > expected.bytes) {
      await _deleteQuietly(part.path);
      have = 0;
    }
    if (have < expected.bytes) {
      try {
        final request = http.Request('GET', _urlFor(name));
        if (have > 0) request.headers[HttpHeaders.rangeHeader] = 'bytes=$have-';
        final response = await client.send(request);
        final resumed = response.statusCode == HttpStatus.partialContent;
        if (response.statusCode != HttpStatus.ok && !resumed) {
          await response.stream.drain<void>();
          return ModelNoticeKind.downloadFailed;
        }
        final start = resumed ? have : 0;
        await _write(response.stream, part, resumed ? FileMode.append : FileMode.write, (got) => onBytes(start + got));
      } on FileSystemException catch (error) {
        return _isNoSpace(error) ? ModelNoticeKind.noSpace : ModelNoticeKind.downloadFailed;
      } on Exception {
        return _stopping ? ModelNoticeKind.downloadStopped : ModelNoticeKind.downloadFailed;
      }
    }
    if (_stopping) return ModelNoticeKind.downloadStopped;
    return _checkAndKeep(part, name, ModelNoticeKind.downloadNoMatch);
  }

  /// Renames a checked `.part` into place; deletes it if it isn't the file,
  /// or if checking it failed in any way (a 723 MB `.part` must not linger).
  Future<ModelNoticeKind?> _checkAndKeep(File part, String name, ModelNoticeKind mismatch) async {
    _setTask(ModelTask(ModelTaskKind.checking, file: name));
    final expected = _expected[name]!;
    var kept = false;
    try {
      final matches = await part.length() == expected.bytes && await sha256OfFile(part.path) == expected.sha256;
      if (!matches) return mismatch;
      await part.rename(p.join(directory, name));
      kept = true;
      return null;
    } on FileSystemException {
      return ModelNoticeKind.copyFailed;
    } finally {
      if (!kept) await _deleteQuietly(part.path);
    }
  }

  /// Streams [source] into [target], reporting the bytes written now and then.
  /// `addStream` reads no faster than the file is written, so a fast source
  /// never piles up in memory.
  Future<void> _write(Stream<List<int>> source, File target, FileMode mode, void Function(int done) onProgress) async {
    final sink = target.openWrite(mode: mode);
    var done = 0;
    var reported = 0;
    try {
      await sink.addStream(
        source.map((chunk) {
          done += chunk.length;
          if (done - reported >= _progressStep) {
            reported = done;
            onProgress(done);
          }
          return chunk;
        }),
      );
    } on Object {
      // The source's own error (a stopped download) is the one to report, not the closed file's.
      try {
        await sink.close();
      } on FileSystemException {
        // Closed with the failed stream.
      }
      rethrow;
    }
    // Closing flushes: a full disk shows here.
    await sink.close();
    onProgress(done);
  }

  Future<ModelFileState> _stateOf(String name, int bytes) async {
    try {
      final size = await File(p.join(directory, name)).length();
      return size == bytes ? ModelFileState.ready : ModelFileState.wrongSize;
    } on FileSystemException {
      return ModelFileState.missing;
    }
  }

  /// Model files dropped one folder up (Finder's file sharing puts them in
  /// Documents, not Documents/models; adb may push to files/) are moved in
  /// once they have their exact size, so one still being copied is left
  /// alone until it is whole. A whole one replaces a missing or cut-off file.
  Future<void> _adoptStrayFiles() async {
    for (final MapEntry(key: name, value: file) in _expected.entries) {
      final target = p.join(directory, name);
      try {
        if (await _isWholeStray(name, file.bytes) && await _lengthOrZero(File(target)) != file.bytes) {
          await File(_strayPath(name)).rename(target);
        } else if (_ownFolder && await File(_strayPath(name)).exists()) {
          // Still being copied, or left beside a whole model: out of backups meanwhile.
          await Device.excludeFromBackup(_strayPath(name));
        }
      } on FileSystemException {
        // Left where it is; the status shows what the models folder holds.
      }
    }
  }

  /// Whether a file named [name] one folder up has the model's size exactly:
  /// only such a file is ever moved in or deleted, never anything else there.
  Future<bool> _isWholeStray(String name, int bytes) async => await _lengthOrZero(File(_strayPath(name))) == bytes;

  String _strayPath(String name) => p.join(_directory.parent.path, name);

  /// The picker copies each picked file into the app's cache first: up to
  /// 723 MB that must not stay behind.
  Future<void> _clearPickerCopies() async {
    try {
      await FilePicker.clearTemporaryFiles();
    } on Exception {
      // Nothing to clear here (tests), or the system clears its cache itself.
    }
  }

  Uri _urlFor(String name) {
    final base = _downloadUrl.endsWith('/') ? _downloadUrl : '$_downloadUrl/';
    return Uri.parse(base).resolve(Uri.encodeComponent(name));
  }

  String _partPath(String name) => p.join(directory, '$name$_partExtension');

  Result<void> _fail(ModelNotice notice, String message) {
    _notice = notice;
    return Err(message);
  }

  void _setTask(ModelTask? task) {
    _task = task;
    notifyListeners();
  }

  static String _importError(ModelNoticeKind kind) => switch (kind) {
    ModelNoticeKind.notModelFile => ModelStoreError.notModelFile,
    ModelNoticeKind.wrongFile => ModelStoreError.wrongFile,
    ModelNoticeKind.noSpace => ModelStoreError.noSpace,
    _ => ModelStoreError.copyFailed,
  };

  static String _downloadError(ModelNoticeKind kind) => switch (kind) {
    ModelNoticeKind.downloadNoMatch => ModelStoreError.downloadNoMatch,
    ModelNoticeKind.downloadStopped => ModelStoreError.downloadStopped,
    ModelNoticeKind.noSpace => ModelStoreError.noSpace,
    _ => ModelStoreError.downloadFailed,
  };

  static bool _isNoSpace(FileSystemException error) => error.osError?.errorCode == _noSpaceError;

  static Future<int> _lengthOrZero(File file) async {
    try {
      return await file.length();
    } on FileSystemException {
      return 0;
    }
  }

  static Future<void> _deleteIfThere(String path) async {
    try {
      await File(path).delete();
    } on PathNotFoundException {
      // Already gone.
    }
  }

  /// Cleanup that may fail without anyone needing to know.
  static Future<void> _deleteQuietly(String path) async {
    try {
      await File(path).delete();
    } on FileSystemException {
      // Overwritten by the next attempt.
    }
  }
}

/// "841 MB", "2.4 GB": decimal units, as phones show storage.
String formatBytes(int bytes) {
  const mega = 1000 * 1000;
  const giga = 1000 * mega;
  if (bytes >= giga) return '${(bytes / giga).toStringAsFixed(1)} GB';
  if (bytes >= mega) return '${(bytes / mega).round()} MB';
  if (bytes >= 1000) return '${(bytes / 1000).round()} KB';
  return '$bytes B';
}
