import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/core/device.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const device = MethodChannel('nota/device');
  late List<String> calls;

  setUp(() {
    calls = [];
    Device.reset();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(device, (call) async {
      calls.add('${call.method}:${call.arguments}');
      return null;
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(device, null);
  });

  test('the screen stays on while anyone holds it, and is told only of changes', () async {
    final recording = Object();
    final transcription = Object();
    await Device.keepScreenOn(recording, true);
    await Device.keepScreenOn(transcription, true);
    await Device.keepScreenOn(recording, true);
    await Device.keepScreenOn(recording, false);
    expect(calls, ['keepScreenOn:true']);
    await Device.keepScreenOn(transcription, false);
    await Device.keepScreenOn(transcription, false);
    expect(calls, ['keepScreenOn:true', 'keepScreenOn:false']);
  });

  test('the audio is handed back when the last one recording or playing is done', () async {
    final dictation = Object();
    final player = Object();
    await Device.useAudio(dictation, true);
    await Device.useAudio(player, true);
    await Device.useAudio(dictation, false);
    expect(calls, isEmpty, reason: 'the player still plays');
    await Device.useAudio(player, false);
    expect(calls, ['releaseAudio:null']);
    await Device.useAudio(player, false);
    expect(calls, hasLength(1));
  });

  test('one never using the audio has nothing to hand back', () async {
    await Device.useAudio(Object(), false);
    expect(calls, isEmpty);
  });

  test('a phone that refuses is let go', () async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      device,
      (call) async => throw PlatformException(code: 'failed'),
    );
    final owner = Object();
    await Device.keepScreenOn(owner, true);
    await Device.useAudio(owner, true);
    await Device.useAudio(owner, false);
    await Device.excludeFromBackup('/nowhere');
  });
}
