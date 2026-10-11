import type { Request, Response, RequestHandler } from "express";
import multer from "multer";
import sharp, { type Metadata } from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  CROPS,
  type Crop,
  type Detection,
  type Report,
  type ReportLocation,
} from "../../shared/report.js";
import { uploadPhoto } from "./upload.js";
import { ReportStore } from "./report.js";
class InvalidReport extends Error {}
const date = (v: unknown): v is string =>
  typeof v === "string" && v.length < 80 && Number.isFinite(Date.parse(v));
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
function jsonField(v: unknown, fallback?: unknown): any {
  if (v === undefined && fallback !== undefined) return fallback;
  if (typeof v !== "string")
    throw new InvalidReport("Invalid report metadata.");
  try {
    return JSON.parse(v);
  } catch {
    throw new InvalidReport("Invalid report metadata.");
  }
}
function parseLocation(v: unknown): ReportLocation {
  const l = jsonField(v);
  if (
    !l ||
    !finite(l.latitude) ||
    Math.abs(l.latitude) > 90 ||
    !finite(l.longitude) ||
    Math.abs(l.longitude) > 180 ||
    !(l.accuracy === null || (finite(l.accuracy) && l.accuracy >= 0)) ||
    !date(l.recordedAt)
  )
    throw new InvalidReport("Valid automatic location is required.");
  return {
    latitude: l.latitude,
    longitude: l.longitude,
    accuracy: l.accuracy,
    recordedAt: l.recordedAt,
  };
}
function parseDetections(v: unknown): Detection[] {
  const ds = jsonField(v, []);
  if (!Array.isArray(ds) || ds.length > 50)
    throw new InvalidReport("Invalid detections.");
  return ds.map((d) => {
    const b = d?.box;
    if (
      !d ||
      typeof d.label !== "string" ||
      !d.label.trim() ||
      d.label.length > 80 ||
      !finite(d.confidence) ||
      d.confidence < 0 ||
      d.confidence > 1 ||
      !b ||
      !["x", "y", "width", "height"].every((k) => finite(b[k])) ||
      b.x < 0 ||
      b.y < 0 ||
      b.width <= 0 ||
      b.height <= 0 ||
      b.x + b.width > 1.00001 ||
      b.y + b.height > 1.00001
    )
      throw new InvalidReport("Invalid detection coordinates or confidence.");
    return {
      label: d.label,
      confidence: d.confidence,
      box: { x: b.x, y: b.y, width: b.width, height: b.height },
    };
  });
}
function escape(v: string) {
  return v.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
async function submit(req: Request, res: Response, store: ReportStore) {
  const { crop, submissionId, capturedAt } = req.body ?? {};
  if (!req.file) throw new InvalidReport("Choose a photo.");
  if (typeof crop !== "string" || !CROPS.includes(crop as Crop))
    throw new InvalidReport("Select a supported crop.");
  if (
    typeof submissionId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(submissionId)
  )
    throw new InvalidReport("Invalid submission ID.");
  if (!date(capturedAt)) throw new InvalidReport("Invalid capture timestamp.");
  const location = parseLocation(req.body.location);
  const detections = parseDetections(req.body.detections);
  const mode = req.body.detectionMode ?? "none";
  const source = req.body.source ?? "gallery";
  if (
    !["none", "simulated", "model"].includes(mode) ||
    !["camera", "gallery"].includes(source) ||
    (mode === "none" && detections.length)
  )
    throw new InvalidReport("Invalid detection mode.");
  const existing = (await store.list(res.locals.user.id)).find(
    (r) => r.submissionId === submissionId,
  );
  if (existing) {
    res.json({ report: existing });
    return;
  }
  let metadata: Metadata;
  let upright: Buffer;
  try {
    const image = sharp(req.file.buffer, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error();
    upright = await image.rotate().jpeg({ quality: 95 }).toBuffer();
  } catch {
    throw new InvalidReport(
      "Choose a readable JPEG, PNG or WebP under 40 megapixels.",
    );
  }
  const normalized = await sharp(upright).metadata();
  const width = normalized.width!;
  const height = normalized.height!;
  const id = randomUUID();
  const originalFilename =
    id +
    "-original." +
    (({ jpeg: "jpg", png: "png", webp: "webp" } as Record<string, string>)[
      metadata.format!
    ] ?? "jpg");
  const filename = id + ".jpg";
  const directory = path.join(store.directory, "images");
  let output = upright;
  if (detections.length) {
    const font = Math.max(14, Math.round(width / 60));
    const boxes = detections
      .map((d) => {
        const b = d.box,
          x = b.x * width,
          y = b.y * height;
        return `<rect x="${x}" y="${y}" width="${b.width * width}" height="${b.height * height}" fill="none" stroke="#ffd54f" stroke-width="${Math.max(3, width / 400)}"/><text x="${x + 4}" y="${Math.min(height - font, Math.max(font + 5, y + font + 4))}" fill="#fff" stroke="#000" stroke-width="1" paint-order="stroke" font-family="sans-serif" font-size="${font}">${escape(d.label)} ${Math.round(d.confidence * 100)}%</text>`;
      })
      .join("");
    const watermark =
      mode === "simulated"
        ? `<rect width="${width}" height="${font * 2.5}" fill="#572f00"/><text x="12" y="${font * 1.7}" fill="white" font-family="sans-serif" font-size="${font}">SIMULATED DEMO — NOT A MODEL DIAGNOSIS</text>`
        : "";
    output = await sharp(upright)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${width}" height="${height}">${boxes}${watermark}</svg>`,
          ),
        },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
  }
  const report: Report = {
    id,
    submissionId,
    farmerId: res.locals.user.id,
    crop: crop as Crop,
    source,
    image: {
      filename,
      originalFilename,
      mimeType: "image/jpeg",
      width,
      height,
      annotated: !!detections.length,
    },
    location,
    detections,
    detectionMode: mode,
    status: "pending",
    version: 0,
    reviews: [],
    capturedAt: new Date(capturedAt).toISOString(),
    createdAt: new Date().toISOString(),
  };
  await mkdir(directory, { recursive: true });
  const files = [
    path.join(directory, filename),
    path.join(directory, originalFilename),
  ];
  let saved: Report;
  try {
    await writeFile(files[0], output, { flag: "wx" });
    await writeFile(files[1], req.file.buffer, { flag: "wx" });
    saved = await store.save(report);
  } catch (error) {
    await Promise.all(files.map((f) => rm(f, { force: true })));
    throw error;
  }
  if (saved.id !== id)
    await Promise.all(files.map((f) => rm(f, { force: true })));
  res.status(saved.id === id ? 201 : 200).json({ report: saved });
}
export function createSubmitReport(store: ReportStore): RequestHandler {
  return (req, res) => {
    if (res.locals.user.role !== "farmer") {
      res.status(403).json({ message: "Only farmers can submit reports." });
      return;
    }
    uploadPhoto(req, res, (error) => {
      if (error) {
        const tooLarge =
          error instanceof multer.MulterError &&
          error.code === "LIMIT_FILE_SIZE";
        res
          .status(tooLarge ? 413 : 400)
          .json({
            message: tooLarge
              ? "Photo must be smaller than 10 MB."
              : "Upload one JPEG, PNG or WebP photo.",
          });
        return;
      }
      void submit(req, res, store).catch((error) => {
        if (error instanceof InvalidReport) {
          res.status(400).json({ message: error.message });
          return;
        }
        console.error(error);
        res
          .status(500)
          .json({
            message: "Unable to save report. Your phone can retry safely.",
          });
      });
    });
  };
}
