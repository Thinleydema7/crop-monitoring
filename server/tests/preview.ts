import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { ReportStore } from "../src/report.js";
const directory = await mkdtemp(path.join(tmpdir(), "cropcare-ui-test-"));
await mkdir(path.join(directory, "images"));
const svg = Buffer.from(
  '<svg width="640" height="480"><rect width="640" height="480" fill="#e3eddf"/><ellipse cx="320" cy="230" rx="120" ry="170" fill="#45804a" transform="rotate(25 320 230)"/><path d="M245 380L390 100" stroke="#244c2a" stroke-width="7"/><text x="35" y="440" font-size="24" font-family="sans-serif" fill="#244c2a">SYNTHETIC IMAGE · UI TEST ONLY</text></svg>',
);
await sharp(svg)
  .jpeg()
  .toFile(path.join(directory, "images", "sample.jpg"));
await new ReportStore(directory).save({
  id: "ui-test-report",
  submissionId: "ui-test-submission",
  farmerId: "farmer-demo",
  crop: "Apple",
  source: "gallery",
  image: {
    filename: "sample.jpg",
    mimeType: "image/jpeg",
    width: 640,
    height: 480,
    annotated: false,
  },
  location: {
    latitude: 27.47,
    longitude: 89.64,
    accuracy: 25,
    recordedAt: new Date().toISOString(),
  },
  detections: [],
  detectionMode: "none",
  status: "pending",
  version: 0,
  reviews: [],
  capturedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
});
createApp(
  "isolated-preview-secret-abcdefghijklmnopqrstuvwxyz",
  directory,
).listen(4001, "127.0.0.1", () =>
  console.log("Isolated dashboard QA: http://localhost:4001"),
);
