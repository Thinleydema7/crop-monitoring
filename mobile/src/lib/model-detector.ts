import { File } from "expo-file-system";
import { Asset } from "expo-asset";
import jpeg from "jpeg-js";
import { loadTensorflowModel } from "react-native-fast-tflite";
import type { Detection } from "../../../shared/report";
import type { Detector } from "./detector";

const SIZE = 640;
const LABEL = "diseased";
const IOU_THRESHOLD = 0.45;
const MAX_CANDIDATES = 300;
const MAX_DETECTIONS = 20;

type Candidate = { x: number; y: number; width: number; height: number; confidence: number };

function letterboxRgb(data: Uint8Array, width: number, height: number) {
  const scale = Math.min(SIZE / width, SIZE / height);
  const resizedWidth = Math.round(width * scale);
  const resizedHeight = Math.round(height * scale);
  const padX = Math.round((SIZE - resizedWidth) / 2 - 0.1);
  const padY = Math.round((SIZE - resizedHeight) / 2 - 0.1);
  const plane = SIZE * SIZE;
  const input = new Float32Array(3 * plane);
  input.fill(114 / 255);

  // Convert the decoded RGB image to the model's NCHW tensor while resizing.
  for (let y = 0; y < resizedHeight; y++) {
    const sourceY = Math.max(0, Math.min(height - 1, (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(height - 1, y0 + 1);
    const fy = sourceY - y0;
    for (let x = 0; x < resizedWidth; x++) {
      const sourceX = Math.max(0, Math.min(width - 1, (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(width - 1, x0 + 1);
      const fx = sourceX - x0;
      const dst = (y + padY) * SIZE + x + padX;
      const p00 = (y0 * width + x0) * 3;
      const p01 = (y0 * width + x1) * 3;
      const p10 = (y1 * width + x0) * 3;
      const p11 = (y1 * width + x1) * 3;
      for (let c = 0; c < 3; c++) {
        const top = data[p00 + c] * (1 - fx) + data[p01 + c] * fx;
        const bottom = data[p10 + c] * (1 - fx) + data[p11 + c] * fx;
        input[c * plane + dst] = (top * (1 - fy) + bottom * fy) / 255;
      }
    }
  }
  return { input, scale, padX, padY };
}

function intersectionOverUnion(a: Candidate, b: Candidate) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function decodeOutput(output: ArrayBuffer, width: number, height: number, scale: number, padX: number, padY: number) {
  // The exported YOLO26s head is [1, 5, 8400]: normalized xywh and one class score.
  const values = new Float32Array(output);
  if (values.length !== 5 * 8400) throw new Error("Unexpected model output tensor shape.");
  const candidates: Candidate[] = [];
  for (let i = 0; i < 8400; i++) {
    const confidence = values[4 * 8400 + i];
    if (!Number.isFinite(confidence) || confidence < 0.05) continue;
    const cx = values[i] * SIZE;
    const cy = values[8400 + i] * SIZE;
    const boxWidth = values[2 * 8400 + i] * SIZE;
    const boxHeight = values[3 * 8400 + i] * SIZE;
    if (![cx, cy, boxWidth, boxHeight].every(Number.isFinite) || boxWidth <= 0 || boxHeight <= 0) continue;
    const x1 = (cx - boxWidth / 2 - padX) / (scale * width);
    const y1 = (cy - boxHeight / 2 - padY) / (scale * height);
    const x2 = (cx + boxWidth / 2 - padX) / (scale * width);
    const y2 = (cy + boxHeight / 2 - padY) / (scale * height);
    const left = Math.max(0, Math.min(1, x1));
    const top = Math.max(0, Math.min(1, y1));
    const right = Math.max(0, Math.min(1, x2));
    const bottom = Math.max(0, Math.min(1, y2));
    if (right <= left || bottom <= top) continue;
    candidates.push({ x: left, y: top, width: right - left, height: bottom - top, confidence });
  }
  candidates.sort((a, b) => b.confidence - a.confidence);
  const kept: Candidate[] = [];
  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    if (kept.every((prior) => intersectionOverUnion(candidate, prior) <= IOU_THRESHOLD)) {
      kept.push(candidate);
      if (kept.length === MAX_DETECTIONS) break;
    }
  }
  return kept.map(({ confidence, ...box }): Detection => ({ label: LABEL, confidence, box }));
}

export async function createModelDetector(): Promise<Detector> {
  const modelAsset = Asset.fromModule(require("../../assets/model/best.tflite"));
  await modelAsset.downloadAsync();
  if (!modelAsset.localUri) {
    throw new Error("The bundled crop model could not be copied to local storage.");
  }
  const model = await loadTensorflowModel({ url: modelAsset.localUri }, []);
  const inputTensor = model.inputs[0];
  const outputTensor = model.outputs[0];
  if (
    model.inputs.length !== 1 ||
    model.outputs.length !== 1 ||
    inputTensor?.dataType !== "float32" ||
    String(inputTensor.shape) !== "1,3,640,640" ||
    outputTensor?.dataType !== "float32" ||
    String(outputTensor.shape) !== "1,5,8400"
  ) {
    throw new Error("The crop model has an unsupported input or output tensor format.");
  }

  return {
    mode: "model",
    async analyze(image) {
      const bytes = await new File(image.uri).bytes();
      const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: false });
      const { input, scale, padX, padY } = letterboxRgb(decoded.data, decoded.width, decoded.height);
      const result = await model.run([input.buffer as ArrayBuffer]);
      if (!result[0]) throw new Error("The crop model returned no output.");
      return decodeOutput(result[0], image.width, image.height, scale, padX, padY);
    },
  };
}
