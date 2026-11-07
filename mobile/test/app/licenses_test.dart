import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/app/licenses.dart';

const _models = 'Speech models (Hohe, punctuation)';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('every bundled licence loads: the fonts, the speech models and ONNX Runtime', () async {
    registerLicenses();
    final entries = await LicenseRegistry.licenses.toList();
    String textOf(String package) => entries
        .where((entry) => entry.packages.contains(package))
        .expand((entry) => entry.paragraphs)
        .map((paragraph) => paragraph.text)
        .join('\n');

    expect(textOf('Plus Jakarta Sans'), contains('SIL OPEN FONT LICENSE'));
    expect(textOf('Noto Sans Ethiopic'), contains('SIL OPEN FONT LICENSE'));
    final models = textOf(_models);
    expect(models, contains('Chapi and the Dataset.ET contributors'));
    expect(models, contains('Ethio-ASR'));
    expect(models, contains('Apache License'));
    expect(models, contains('Copyright (c) Meta Platforms, Inc. and affiliates.'));
    expect(models, contains('Copyright (c) Facebook, Inc. and its affiliates.'));
    final runtime = textOf('ONNX Runtime');
    expect(runtime, contains('Copyright (c) Microsoft Corporation'));
    expect(runtime, contains('Eigen'));
  });
}
