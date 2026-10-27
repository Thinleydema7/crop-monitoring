# Model integration

The Android and iOS app now loads `mobile/assets/model/best.tflite` for on-device inference. Embedded metadata identifies an Ultralytics YOLO26s detector, input size 640×640, one class (`diseased`), stride 32, and a non-end-to-end detection head. Artifact SHA-256: `18875abca8f86c9040e027731232708a109bd153317a45dfeb9a5652272ea5da`.

Adapter assumptions: TFLite input is float32 `[1, 3, 640, 640]`, RGB in 0–1, letterboxed with value 114; output is float32 `[1, 5, 8400]` (normalized xywh and one class score). Boxes are mapped back through the letterbox to the analyzed photo and clipped to its edges. Class-agnostic NMS uses IoU 0.7 and the app applies a 0.6 confidence threshold. The embedded metadata reports Ultralytics 8.4.184. Keep test images with expected detections alongside future model updates to validate preprocessing and output decoding.

The detector is implemented in `mobile/src/lib/model-detector.ts` and loaded once through `mobile/src/lib/detector.ts`. Input is an upright JPEG plus actual width and height. Output boxes use normalized top-left x/y/width/height in the exact original analyzed frame, after reversing model letterboxing. Confidence is 0–1. Empty output means no detections above the app threshold; it is not a health guarantee.

The same `analyzePhoto` function serves gallery and sampled-camera images. Camera inference currently samples JPEG images; high-rate continuous inference would need a supported native frame processor that preserves frame IDs, orientation, and original image dimensions.
