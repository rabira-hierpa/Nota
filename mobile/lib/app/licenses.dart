import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Licence texts the app ships beside its own: the fonts' OFL and the speech
/// models' notice. Flutter lists the packages' licences by itself.
const _bundled = <(List<String>, String)>[
  (['Plus Jakarta Sans'], 'assets/licenses/OFL-PlusJakartaSans.txt'),
  (['Noto Sans Ethiopic'], 'assets/licenses/OFL-NotoSansEthiopic.txt'),
  (['Speech models (Hohe, punctuation)'], 'assets/licenses/MODELS-NOTICE.txt'),
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
