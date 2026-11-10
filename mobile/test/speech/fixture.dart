import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

/// Python's answers for the Dart ports, copied from the desktop's
/// electron/speech/fixtures (written by `npm run build:speech -- --fixtures`).
Map<String, Object?> readFixture(String name) {
  final decoded = jsonDecode(File('test/fixtures/$name').readAsStringSync());
  if (decoded is! Map<String, Object?>) throw FormatException('$name is not a JSON object');
  return decoded;
}

/// Little-endian bytes from base64, on a buffer of their own (so typed lists line up).
ByteBuffer fromBase64(Object? text) => Uint8List.fromList(base64Decode(text! as String)).buffer;
