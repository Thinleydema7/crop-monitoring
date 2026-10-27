import type { Detection } from "../../../shared/report";
import { Platform } from "react-native";
export type AnalyzedPhoto = {
  uri: string;
  width: number;
  height: number;
  capturedAt: string;
  source: "camera" | "gallery";
  detections: Detection[];
  detectionMode: "none" | "simulated" | "model";
};
export interface Detector {
  mode: "simulated" | "model";
  analyze(image: {
    uri: string;
    width: number;
    height: number;
  }): Promise<Detection[]>;
}
let detector: Detector | null = null;
let loading: Promise<Detector> | null = null;
export const detectorMode = () => detector?.mode ?? "none";
export function registerDetector(real: Detector) {
  if (real.mode !== "model") throw new Error("Register a model detector.");
  detector = real;
}
async function getDetector() {
  if (detector) return detector;
  if (Platform.OS === "web") {
    throw new Error("On-device crop detection is available in the Android and iOS app.");
  }
  loading ??= Promise.resolve()
    .then(() => {
      // Keep the native adapter in the main Metro bundle; a deferred chunk can
      // fail on USB-connected phones when the dev server host is unreachable.
      const { createModelDetector } = require("./model-detector") as typeof import("./model-detector");
      return createModelDetector();
    })
    .then((model) => {
      registerDetector(model);
      return model;
    })
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}
export async function analyzePhoto(
  photo: Omit<AnalyzedPhoto, "detections" | "detectionMode">,
  threshold = 0.25,
): Promise<AnalyzedPhoto> {
  const activeDetector = await getDetector();
  const detections = (await activeDetector.analyze(photo)).filter(
    (d) => d.confidence >= threshold,
  );
  for (const d of detections) {
    const b = d.box;
    if (
      !d.label ||
      !Number.isFinite(d.confidence) ||
      d.confidence < 0 ||
      d.confidence > 1 ||
      ![b.x, b.y, b.width, b.height].every(Number.isFinite) ||
      b.x < 0 ||
      b.y < 0 ||
      b.width <= 0 ||
      b.height <= 0 ||
      b.x + b.width > 1 ||
      b.y + b.height > 1
    )
      throw new Error("Detector returned invalid normalized boxes.");
  }
  return { ...photo, detections, detectionMode: activeDetector.mode };
}
