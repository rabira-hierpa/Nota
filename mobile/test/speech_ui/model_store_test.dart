import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nota/core/result.dart';
import 'package:nota/features/speech/models/model_store.dart';
import 'package:path/path.dart' as p;
import 'package:share_plus/share_plus.dart' show XFile;

import 'speech_fixtures.dart';

/// A picked file, as the system picker hands one over: a name and a path
/// (or, with [streamOnly], only its bytes).
final class _PickedFile extends PlatformFile {
  _PickedFile(this._path, {String? name, this.streamOnly = false}) : name = name ?? p.basename(_path);

  final String _path;
  final bool streamOnly;

  @override
  String? get path => streamOnly ? null : _path;

  @override
  final String name;

  @override
  Uri get uri => streamOnly ? Uri.parse('content://picked/$name') : Uri.file(_path);

  @override
  XFile get xFile => XFile(_path, name: name);

  @override
  int? lengthSync() => File(_path).lengthSync();

  @override
  Future<int?> length() async => File(_path).length();

  @override
  Future<Uint8List> readAsBytes() => File(_path).readAsBytes();

  @override
  Stream<Uint8List> readAsByteStream() => File(_path).openRead().map(Uint8List.fromList);
}

void main() {
  late Directory root;
  late Directory models;
  late Directory picked;

  setUp(() async {
    root = await Directory.systemTemp.createTemp('nota_models_');
    models = Directory(p.join(root.path, 'models'));
    picked = await Directory(p.join(root.path, 'picked')).create();
  });

  tearDown(() => root.delete(recursive: true));

  Future<ModelStore> open({
    List<PlatformFile> pick = const [],
    String url = '',
    http.Client? client,
    List<String> pickerFolders = const [],
  }) => ModelStore.open(
    directory: models,
    expected: fakeModelFiles,
    downloadUrl: url,
    client: client == null ? null : () => client,
    pick: () async => pick,
    pickerFolders: pickerFolders,
  );

  Future<String> pickable(String name, List<int> bytes) async {
    final file = File(p.join(picked.path, name));
    await file.writeAsBytes(bytes);
    return file.path;
  }

  group('status', () {
    test('is missing with no files, and creates the folder', () async {
      final store = await open();
      expect(await models.exists(), isTrue);
      expect(store.status.readiness, ModelReadiness.missing);
      expect(store.status.missing, fakeModelFiles.keys.toList());
      expect(store.status.hasAny, isFalse);
      expect(store.directory, models.path);
    });

    test('is ready when every file has its expected size', () async {
      await writeFakeModels(models);
      final store = await open();
      expect(store.status.readiness, ModelReadiness.ready);
      expect(store.status.isReady, isTrue);
      expect(store.status.missing, isEmpty);
    });

    test('is partial while some files are missing', () async {
      await writeFakeModels(models, only: [fakeHohe]);
      final store = await open();
      expect(store.status.readiness, ModelReadiness.partial);
      expect(store.status.missing, [fakeTokens, fakePunctuation]);
      expect(store.status.wrongSize, isEmpty);
    });

    test('names a file of the wrong size', () async {
      await writeFakeModels(models);
      await File(p.join(models.path, fakeTokens)).writeAsString('cut');
      final store = await open();
      expect(store.status.readiness, ModelReadiness.partial);
      expect(store.status.wrongSize, [fakeTokens]);
    });

    test('moves model files dropped one folder up into the models folder', () async {
      await root.create(recursive: true);
      for (final MapEntry(key: name, value: bytes) in fakeModelBytes.entries) {
        await File(p.join(root.path, name)).writeAsBytes(bytes);
      }
      final store = await open();
      expect(store.status.isReady, isTrue);
      expect(File(p.join(root.path, fakeHohe)).existsSync(), isFalse);
    });

    test('a whole file dropped one folder up replaces one of the wrong size', () async {
      await writeFakeModels(models);
      await File(p.join(models.path, fakeHohe)).writeAsString('cut');
      await File(p.join(root.path, fakeHohe)).writeAsBytes(fakeModelBytes[fakeHohe]!);
      final store = await open();
      expect(store.status.isReady, isTrue);
      expect(File(p.join(models.path, fakeHohe)).readAsBytesSync(), fakeModelBytes[fakeHohe]);
      expect(File(p.join(root.path, fakeHohe)).existsSync(), isFalse);
    });

    test('leaves a file one folder up alone while it is still short (Finder copying)', () async {
      final hohe = fakeModelBytes[fakeHohe]!;
      final stray = File(p.join(root.path, fakeHohe));
      await stray.writeAsBytes(hohe.sublist(0, hohe.length - 1));
      final store = await open();
      expect(store.status.missing, contains(fakeHohe));
      expect(stray.lengthSync(), hohe.length - 1);

      await stray.writeAsBytes(hohe);
      await store.refresh();
      expect(store.status.missing, isNot(contains(fakeHohe)));
      expect(stray.existsSync(), isFalse);
    });

    test('keeps a file in place over a whole one dropped one folder up', () async {
      await writeFakeModels(models);
      final stray = File(p.join(root.path, fakeTokens));
      await stray.writeAsBytes(fakeModelBytes[fakeTokens]!);
      final store = await open();
      expect(store.status.isReady, isTrue);
      expect(stray.existsSync(), isTrue);
    });

    test('refresh sees files copied in later', () async {
      final store = await open();
      await writeFakeModels(models);
      expect(store.status.isReady, isFalse);
      await store.refresh();
      expect(store.status.isReady, isTrue);
    });

    test('totals the expected sizes', () async {
      final store = await open();
      expect(store.totalBytes, fakeModelBytes.values.fold(0, (sum, bytes) => sum + bytes.length));
    });
  });

  group('import', () {
    test('copies the picked model files in and checks them', () async {
      final files = [
        for (final MapEntry(key: name, value: bytes) in fakeModelBytes.entries)
          _PickedFile(await pickable(name, bytes)),
      ];
      final store = await open(pick: files);
      final result = await store.importFiles();
      expect(result, isA<Ok<void>>());
      expect(store.status.isReady, isTrue);
      expect(store.notice?.kind, ModelNoticeKind.imported);
      expect(store.notice?.count, 3);
      expect(store.task, isNull);
      expect(models.listSync().where((entity) => entity.path.endsWith('.part')), isEmpty);
    });

    test("moves the picker's own copy into place instead of copying it again", () async {
      final source = await pickable(fakeHohe, fakeModelBytes[fakeHohe]!);
      final store = await open(pick: [_PickedFile(source)], pickerFolders: [picked.path]);
      expect(await store.importFiles(), isA<Ok<void>>());
      expect(File(p.join(models.path, fakeHohe)).readAsBytesSync(), fakeModelBytes[fakeHohe]);
      expect(File(source).existsSync(), isFalse);
    });

    test('copies a file the picker only offers as a stream', () async {
      final source = await pickable(fakeTokens, fakeModelBytes[fakeTokens]!);
      final store = await open(pick: [_PickedFile(source, streamOnly: true)]);
      expect(await store.importFiles(), isA<Ok<void>>());
      expect(File(p.join(models.path, fakeTokens)).readAsBytesSync(), fakeModelBytes[fakeTokens]);
      expect(File(source).existsSync(), isTrue, reason: 'only copies the picker made are removed');
    });

    test('knows a renamed file by its size', () async {
      final store = await open(pick: [_PickedFile(await pickable('hohe (1).bin', fakeModelBytes[fakeHohe]!))]);
      expect(await store.importFiles(), isA<Ok<void>>());
      expect(File(p.join(models.path, fakeHohe)).existsSync(), isTrue);
    });

    test('refuses a file of the right name and size but other content', () async {
      final bytes = List<int>.filled(fakeModelBytes[fakeHohe]!.length, 7);
      final store = await open(pick: [_PickedFile(await pickable(fakeHohe, bytes))]);
      final result = await store.importFiles();
      expect(result, isA<Err<void>>());
      expect((result as Err<void>).message, ModelStoreError.wrongFile);
      expect(store.notice?.kind, ModelNoticeKind.wrongFile);
      expect(store.notice?.file, fakeHohe);
      expect(File(p.join(models.path, fakeHohe)).existsSync(), isFalse);
      expect(File(p.join(models.path, '$fakeHohe.part')).existsSync(), isFalse);
    });

    test('names a picked file that is not a model file, and still adds the others', () async {
      final store = await open(
        pick: [
          _PickedFile(await pickable('holiday.jpg', [1, 2, 3])),
          _PickedFile(await pickable(fakeTokens, fakeModelBytes[fakeTokens]!)),
        ],
      );
      final result = await store.importFiles();
      expect(result, isA<Err<void>>());
      expect(store.notice?.kind, ModelNoticeKind.notModelFile);
      expect(store.notice?.file, 'holiday.jpg');
      expect(store.notice?.count, 1);
      expect(store.status.missing, isNot(contains(fakeTokens)));
    });

    test('deletes every copy the picker made, whether or not it was a model file', () async {
      final notModel = await pickable('holiday.jpg', [1, 2, 3]);
      final wrong = await pickable(fakeTokens, List<int>.filled(fakeModelBytes[fakeTokens]!.length, 7));
      final store = await open(pick: [_PickedFile(notModel), _PickedFile(wrong)], pickerFolders: [picked.path]);
      expect(await store.importFiles(), isA<Err<void>>());
      expect(File(notModel).existsSync(), isFalse);
      expect(File(wrong).existsSync(), isFalse);
      expect(models.listSync().where((entity) => entity.path.endsWith('.part')), isEmpty);
    });

    test('does nothing when the picker is cancelled', () async {
      final store = await open();
      expect(await store.importFiles(), isA<Ok<void>>());
      expect(store.notice, isNull);
    });
  });

  group('download', () {
    test('is offered only when the build names a place', () async {
      expect((await open()).canDownload, isFalse);
      expect(await (await open()).download(), isA<Err<void>>());
      expect((await open(url: 'https://models.example/nota')).canDownload, isTrue);
    });

    test('downloads the missing files, checks them, and renames them into place', () async {
      await writeFakeModels(models, only: [fakeTokens]);
      final requested = <String>[];
      final client = MockClient((request) async {
        requested.add(request.url.toString());
        final name = p.basename(request.url.path);
        return http.Response.bytes(fakeModelBytes[name]!, 200);
      });
      final store = await open(url: 'https://models.example/nota', client: client);
      expect(await store.download(), isA<Ok<void>>());
      expect(store.status.isReady, isTrue);
      expect(requested, ['https://models.example/nota/$fakeHohe', 'https://models.example/nota/$fakePunctuation']);
      expect(store.notice?.kind, ModelNoticeKind.downloaded);
      expect(store.downloadProgress, isNull);
    });

    test('resumes a stopped download with a range request', () async {
      final hohe = fakeModelBytes[fakeHohe]!;
      await writeFakeModels(models, only: [fakeTokens, fakePunctuation]);
      await File(p.join(models.path, '$fakeHohe.part')).writeAsBytes(hohe.sublist(0, 10));
      String? range;
      final client = MockClient((request) async {
        range = request.headers['range'];
        return http.Response.bytes(hohe.sublist(10), 206);
      });
      final store = await open(url: 'https://models.example/nota/', client: client);
      expect(await store.download(), isA<Ok<void>>());
      expect(range, 'bytes=10-');
      expect(store.status.isReady, isTrue);
    });

    test('throws away a download that does not match', () async {
      final client = MockClient((request) async => http.Response.bytes(List<int>.filled(3, 0), 200));
      final store = await open(url: 'https://models.example/nota', client: client);
      final result = await store.download();
      expect(result, isA<Err<void>>());
      expect(store.notice?.kind, ModelNoticeKind.downloadNoMatch);
      expect(models.listSync(), isEmpty);
    });

    test('reports a server error', () async {
      final client = MockClient((request) async => http.Response('', 404));
      final store = await open(url: 'https://models.example/nota', client: client);
      expect(await store.download(), isA<Err<void>>());
      expect(store.notice?.kind, ModelNoticeKind.downloadFailed);
    });

    test('stops when asked, keeping what arrived', () async {
      final hohe = fakeModelBytes[fakeHohe]!;
      final body = StreamController<List<int>>();
      final client = MockClient.streaming((request, _) async => http.StreamedResponse(body.stream, 200));
      final store = await open(url: 'https://models.example/nota', client: client);
      final download = store.download();
      body.add(hohe.sublist(0, 5));
      await Future<void>.delayed(const Duration(milliseconds: 20));
      store.stopDownload();
      body.addError(http.ClientException('closed'));
      unawaited(body.close());
      final result = await download;
      expect(result, isA<Err<void>>());
      expect(store.notice?.kind, ModelNoticeKind.downloadStopped);
      expect(File(p.join(models.path, '$fakeHohe.part')).lengthSync(), 5);
    });
  });

  test('delete removes the model files and half-copied ones', () async {
    await writeFakeModels(models);
    await File(p.join(models.path, '$fakeHohe.part')).writeAsString('half');
    final store = await open();
    expect(await store.delete(), isA<Ok<void>>());
    expect(store.status.readiness, ModelReadiness.missing);
    expect(models.listSync(), isEmpty);
    expect(store.notice?.kind, ModelNoticeKind.deleted);
  });

  test('delete removes whole model files left one folder up, and nothing else there', () async {
    await writeFakeModels(models);
    final whole = File(p.join(root.path, fakeHohe));
    await whole.writeAsBytes(fakeModelBytes[fakeHohe]!);
    final otherSize = File(p.join(root.path, fakeTokens));
    await otherSize.writeAsString('another version');
    final unrelated = File(p.join(root.path, 'notes.json'));
    await unrelated.writeAsString('{}');
    final store = await open();
    expect(await store.delete(), isA<Ok<void>>());
    expect(whole.existsSync(), isFalse, reason: 'it would be moved back in on the next look');
    expect(otherSize.readAsStringSync(), 'another version');
    expect(unrelated.existsSync(), isTrue);
    expect(store.status.readiness, ModelReadiness.missing);
  });

  test('sha256OfFile hashes the file in chunks on another isolate', () async {
    final bytes = List<int>.generate(300000, (i) => i % 251);
    final path = await pickable('big.bin', bytes);
    expect(await sha256OfFile(path), sha256.convert(bytes).toString());
  });

  test('formatBytes uses decimal units', () {
    expect(formatBytes(840798098), '841 MB');
    expect(formatBytes(2400000000), '2.4 GB');
    expect(formatBytes(193627), '194 KB');
    expect(formatBytes(12), '12 B');
  });

  test('the fixture hashes are right', () {
    for (final MapEntry(key: name, value: expected) in fakeModelFiles.entries) {
      expect(sha256.convert(fakeModelBytes[name]!).toString(), expected.sha256);
      expect(utf8.decode(fakeModelBytes[name]!).isNotEmpty, isTrue);
    }
  });
}
