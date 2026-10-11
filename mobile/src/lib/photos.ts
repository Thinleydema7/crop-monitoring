import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { AnalyzedPhoto } from "./detector";
export async function preparePhoto(
  uri: string,
  width: number,
  height: number,
  source: "camera" | "gallery",
  capturedAt = new Date().toISOString(),
): Promise<Omit<AnalyzedPhoto, "detections" | "detectionMode">> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > 1920)
    context.resize(width >= height ? { width: 1920 } : { height: 1920 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.9,
  });
  image.release();
  context.release();
  return { ...result, source, capturedAt };
}
