import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// What Nota asks of the phone itself, answered by ios/Runner/AppDelegate.swift
/// and android/app/src/main/kotlin/com/rzcodes/nota/MainActivity.kt. A call
/// that fails is let go: none of these is worth stopping for.
abstract final class Device {
  static const _channel = MethodChannel('nota/device');

  /// Who wants the screen kept on: a recording, dictation, a transcription.
  static final _awake = <Object>{};

  /// Who is recording or playing: dictation, the recording sheet, the player.
  static final _audio = <Object>{};

  /// Keeps the screen from locking while any [owner] holds it [on], so a
  /// recording or a transcription isn't cut short by Auto-Lock (iOS suspends
  /// an app soon after the screen locks).
  static Future<void> keepScreenOn(Object owner, bool on) {
    if (!_hold(_awake, owner, on)) return Future<void>.value();
    return _quietly(() => _channel.invokeMethod<void>('keepScreenOn', _awake.isNotEmpty));
  }

  /// Marks [owner] as recording or playing ([on]), or done with it. When the
  /// last one is done, the audio is handed back, so music or a podcast the
  /// person paused carries on (iOS; Android needs nothing). Not before: on
  /// iOS handing it back stops whatever still records or plays.
  static Future<void> useAudio(Object owner, bool on) {
    if (!_hold(_audio, owner, on) || on) return Future<void>.value();
    return _quietly(() => _channel.invokeMethod<void>('releaseAudio'));
  }

  /// Keeps the file or folder at [path], and what is put in it later, out of
  /// iCloud and computer backups. On Android res/xml's backup rules do this.
  static Future<void> excludeFromBackup(String path) =>
      _quietly(() => _channel.invokeMethod<void>('excludeFromBackup', path));

  /// Forgets every holder, so one test's leftovers don't change the next one's calls.
  @visibleForTesting
  static void reset() {
    _awake.clear();
    _audio.clear();
  }

  /// Adds or removes [owner]; whether [owners] went from empty to not, or back.
  static bool _hold(Set<Object> owners, Object owner, bool on) {
    final held = owners.isNotEmpty;
    if (on) {
      owners.add(owner);
    } else {
      owners.remove(owner);
    }
    return owners.isNotEmpty != held;
  }

  static Future<void> _quietly(Future<void> Function() call) async {
    try {
      await call();
    } on PlatformException {
      // The phone said no; nothing else to try.
    } on MissingPluginException {
      // Tests, where no phone answers.
    }
  }
}
