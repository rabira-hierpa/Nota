/// What the desktop's scripts/build_speech_models.py puts in models/, and
/// what the phone needs of it, with sizes and SHA-256s from its manifest.json.
abstract final class ModelFiles {
  /// Hohe, 8-bit weights.
  static const hohe = 'hohe-w8.onnx';

  /// Hohe's CTC tokens.
  static const hoheTokens = 'hohe.json';

  /// The punctuation model, 8-bit weights.
  static const punctuation = 'punct-w8.onnx';

  /// The punctuation model's labels and word pieces.
  static const punctuationConfig = 'punct.json';

  static const List<String> required = [hohe, hoheTokens, punctuation, punctuationConfig];

  static const Map<String, ({int bytes, String sha256})> expected = {
    hohe: (bytes: 723419839, sha256: '24df360e3fcbd030c99d8684fc353824a8003c74486920f304f0007ad42ced7f'),
    hoheTokens: (bytes: 2453, sha256: '0c35f929eb37d5ad8b06e3783eaebfc7ce5bdb9d00028038ab33a52cd7c9a2eb'),
    punctuation: (bytes: 117182179, sha256: 'e9b8e72cd0455fe7351bf5b86c175f14e13f53c2771102fb0aea6f6e998082e3'),
    punctuationConfig: (bytes: 193627, sha256: '64fde194d9a21722db4467a7581ff9ba929eaef17877d0b9e6f0642d2d91f85d'),
  };
}
