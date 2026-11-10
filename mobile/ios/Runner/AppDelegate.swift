import AVFoundation
import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    DeviceChannel.register(with: engineBridge.applicationRegistrar.messenger())
  }
}

/// What Dart asks of iOS itself (lib/core/device.dart).
private enum DeviceChannel {
  static func register(with messenger: FlutterBinaryMessenger) {
    let channel = FlutterMethodChannel(name: "nota/device", binaryMessenger: messenger)
    channel.setMethodCallHandler { call, result in
      switch call.method {
      case "keepScreenOn":
        UIApplication.shared.isIdleTimerDisabled = (call.arguments as? Bool) ?? false
        result(nil)
      case "excludeFromBackup":
        guard let path = call.arguments as? String else {
          result(FlutterError(code: "bad-argument", message: nil, details: nil))
          return
        }
        var url = URL(fileURLWithPath: path)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        do {
          try url.setResourceValues(values)
          result(nil)
        } catch {
          result(FlutterError(code: "failed", message: nil, details: nil))
        }
      case "releaseAudio":
        // Dart asks only once nothing records or plays (lib/core/device.dart):
        // deactivating stops whatever still does.
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        result(nil)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
