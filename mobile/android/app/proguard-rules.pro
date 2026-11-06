# ONNX Runtime calls these classes from native code by name; R8 must not
# rename or drop them (flutter_onnxruntime's README, "Android").
-keep class ai.onnxruntime.** { *; }
