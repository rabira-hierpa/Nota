import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Licence texts the app ships beside its own: the fonts' OFL, the speech
/// models' notice and the licences it names (the desktop's models/NOTICE and
/// licenses/models/), and ONNX Runtime's, from the tag of the version
/// flutter_onnxruntime links (1.28.0). Flutter lists the Dart packages'
/// licences by itself.
const _models = 'Speech models (Hohe, punctuation)';
const _bundled = <(List<String>, String)>[
  (['Plus Jakarta Sans'], 'assets/licenses/OFL-PlusJakartaSans.txt'),
  (['Noto Sans Ethiopic'], 'assets/licenses/OFL-NotoSansEthiopic.txt'),
  ([_models], 'assets/licenses/MODELS-NOTICE.txt'),
  ([_models], 'assets/licenses/LICENSE-MIT-w2v-bert-2.0.txt'),
  ([_models], 'assets/licenses/LICENSE-Apache-2.0.txt'),
  ([_models], 'assets/licenses/LICENSE-MIT-xlm-roberta.txt'),
  (['ONNX Runtime'], 'assets/licenses/ONNXRUNTIME-LICENSE.txt'),
  (['ONNX Runtime'], 'assets/licenses/ONNXRUNTIME-ThirdPartyNotices.txt'),
];

/// Adds the bundled licences to the licence page. Call once, before runApp.
void registerLicenses() {
  LicenseRegistry.addLicense(_bundledLicenses);
}

Stream<LicenseEntry> _bundledLicenses() async* {
  for (final (packages, asset) in _bundled) {
    final text = await rootBundle.loadString(asset);
    yield LicenseEntryWithLineBreaks(packages, text);
  }
}
