import { Schema, model } from "mongoose";

export const UserModel = model(
  "User",
  new Schema(
    {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ["farmer", "officer"], required: true },
    },
    { timestamps: true },
  ),
);

const reportSchema = new Schema(
  {
    _id: { type: String, required: true },
    submissionId: { type: String, required: true },
    farmerId: { type: String, required: true },
    crop: { type: String, required: true },
    source: String,
    image: {
      filename: String,
      originalFilename: String,
      url: String, // server-only, never sent to clients
      originalUrl: String, // server-only
      publicId: String, // server-only
      originalPublicId: String, // server-only
      mimeType: String,
      width: Number,
      height: Number,
      annotated: Boolean,
    },
    location: { latitude: Number, longitude: Number, accuracy: Number, recordedAt: String },
    detections: [
      {
        _id: false,
        label: String,
        confidence: Number,
        box: { x: Number, y: Number, width: Number, height: Number },
      },
    ],
    detectionMode: String,
    status: { type: String, default: "pending" },
    version: { type: Number, default: 0 },
    reviews: [
      {
        _id: false,
        id: String,
        officerId: String,
        diagnosis: String,
        recommendation: String,
        createdAt: String,
      },
    ],
    capturedAt: String,
    createdAt: String,
  },
  { versionKey: false },
);

// Retry safety: one submissionId per farmer, enforced by the database
reportSchema.index({ farmerId: 1, submissionId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

export const ReportModel = model("Report", reportSchema);