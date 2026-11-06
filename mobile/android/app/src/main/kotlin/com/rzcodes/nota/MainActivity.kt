package com.rzcodes.nota

import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // What Dart asks of Android itself (lib/core/device.dart).
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "nota/device").setMethodCallHandler { call, result ->
            when (call.method) {
                "keepScreenOn" -> {
                    if (call.arguments == true) {
                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    } else {
                        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    }
                    result.success(null)
                }
                // res/xml's backup rules already keep everything out of cloud backups.
                "excludeFromBackup" -> result.success(null)
                // The audio plugins give up audio focus themselves.
                "releaseAudio" -> result.success(null)
                else -> result.notImplemented()
            }
        }
    }
}
