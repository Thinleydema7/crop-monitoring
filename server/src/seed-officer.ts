import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { connectDB } from "./db.js";
import { UserModel } from "./models.js";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password || password.length < 8) {
  console.error('Usage: npm run seed:officer -- email "Full Name" "Password123!"');
  process.exit(1);
}
await connectDB();
await UserModel.updateOne(
  { email: email.toLowerCase() },
  {
    $setOnInsert: { _id: randomUUID() },
    $set: { name, role: "officer", passwordHash: await bcrypt.hash(password, 12) },
  },
  { upsert: true },
);
console.log("Officer ready:", email);
process.exit(0);