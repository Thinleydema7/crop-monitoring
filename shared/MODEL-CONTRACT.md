# Detector handoff

Real inference is pending the teammate's trained model. The current detector is explicitly simulated and does not diagnose crops.

Provide the model artifact, runtime/export format (TFLite, ONNX, etc.), model version, SHA-256 checksum, input tensor shape and dtype, color order, normalization, resizing/letterboxing rules, class labels, output tensor specification, NMS rules, and test images with expected detections.

Implement the Detector interface in mobile/src/lib/detector.ts and register it once. Input is an upright JPEG plus actual width and height. Output boxes use normalized top-left x/y/width/height in the exact original analyzed frame, after reversing any model letterboxing. Confidence is 0–1. Empty output means no detections; it is not a health guarantee.

The same analyzePhoto function serves gallery and sampled-camera images. For real high-rate continuous inference replace sampled takePictureAsync with a supported native frame processor after selecting the runtime; preserve frame IDs, orientation and original image dimensions.
