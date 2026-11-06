import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:nota/features/speech/hohe/model_files.dart';

/// The desktop's models/manifest.json, when this checkout has built the models.
final _manifest = File('../models/manifest.json');

void main() {
  group('ModelFiles', () {
    test('needs the four files, each with a size and a SHA-256', () {
      expect(ModelFiles.required, [
        ModelFiles.hohe,
        ModelFiles.hoheTokens,
        ModelFiles.punctuation,
        ModelFiles.punctuationConfig,
      ]);
      expect(ModelFiles.expected.keys.toSet(), ModelFiles.required.toSet());
      for (final file in ModelFiles.expected.values) {
        expect(file.bytes, greaterThan(0));
        expect(file.sha256, matches(RegExp(r'^[0-9a-f]{64}$')));
      }
    });

    test("matches the desktop's manifest", () {
      final files =
          (jsonDecode(_manifest.readAsStringSync()) as Map<String, Object?>)['files']! as Map<String, Object?>;
      for (final MapEntry(key: name, value: expected) in ModelFiles.expected.entries) {
        final entry = files[name]! as Map<String, Object?>;
        expect((bytes: entry['bytes'], sha256: entry['sha256']), (bytes: expected.bytes, sha256: expected.sha256));
      }
    }, skip: _manifest.existsSync() ? false : 'models/ not built in this checkout');
  });
}
