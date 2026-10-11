import type { Detection } from "../../../shared/report";
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
// An interface demonstration only. No disease classification is performed.
const simulated: Detector = {
  mode: "simulated",
  async analyze() {
    return [
      {
        label: "Simulated suspected region",
        confidence: 0.86,
        box: { x: 0.22, y: 0.23, width: 0.48, height: 0.4 },
      },
    ];
  },
};
let detector: Detector = simulated;
export const detectorMode = () => detector.mode;
export function registerDetector(real: Detector) {
  if (real.mode !== "model") throw new Error("Register a model detector.");
  detector = real;
}
export async function analyzePhoto(
  photo: Omit<AnalyzedPhoto, "detections" | "detectionMode">,
  threshold = 0.6,
): Promise<AnalyzedPhoto> {
  const detections = (await detector.analyze(photo)).filter(
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
  return { ...photo, detections, detectionMode: detector.mode };
}
