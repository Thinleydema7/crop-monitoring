import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./db.js";

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error("Set JWT_SECRET to at least 32 characters.");

await connectDB();
const port = Number(process.env.PORT ?? 4000);
createApp(secret).listen(port, "0.0.0.0", () =>
  console.log(`CropCare API and officer dashboard: http://localhost:${port}`),
);