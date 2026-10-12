
import "dotenv/config";
import path from "node:path";
import { createApp } from "./app.js";
import { connectDatabase } from "./database.js";

async function main() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Set JWT_SECRET to at least 32 characters.");
  }

  const port = Number(process.env.PORT ?? 4000);

  await connectDatabase();

  createApp(
    secret,
    process.env.STORAGE_DIR
      ? path.resolve(process.env.STORAGE_DIR)
      : undefined,
  ).listen(port, "0.0.0.0", () => {
    console.log(
      `CropCare API and officer dashboard: http://localhost:${port}`,
    );
  });
}

main().catch((error) => {
  console.error("Failed to start CropCare server:", error);
  process.exit(1);
});
