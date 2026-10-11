import "dotenv/config";
import path from "node:path";
import { createApp } from "./app.js";
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error("Set JWT_SECRET to at least 32 characters.");
const port = Number(process.env.PORT ?? 4000);
createApp(
  secret,
  process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : undefined,
).listen(port, "0.0.0.0", () =>
  console.log(`CropCare API and officer dashboard: http://localhost:${port}`),
);
