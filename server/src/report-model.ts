import mongoose, { Schema } from "mongoose";

const DetectionSchema = new Schema(
  {
    label: { type: String, required: true },
    confidence: { type: Number, required: true },
    box: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
  },
  { _id: false },
);

const ReviewSchema = new Schema(
  {
    id: { type: String, required: true },
    officerId: { type: String, required: true },
    diagnosis: { type: String, required: true },
    recommendation: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false },
);

const ReportSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    submissionId: { type: String, required: true },
    farmerId: { type: String, required: true, index: true },
    crop: {
      type: String,
      required: true,
      enum: ["Rice", "Maize", "Potato", "Tomato", "Apple", "Chilli"],
    },
    source: {
      type: String,
      required: true,
      enum: ["gallery", "camera"],
    },
    image: {
      filename: { type: String, required: true },
      originalFilename: { type: String },
      mimeType: { type: String, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      annotated: { type: Boolean, required: true },
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number, default: null },
      recordedAt: { type: String, required: true },
    },
    detections: { type: [DetectionSchema], default: [] },
    detectionMode: {
      type: String,
      required: true,
      enum: ["none", "simulated", "model"],
    },
    version: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ["pending", "reviewed"],
      default: "pending",
    },
    reviews: { type: [ReviewSchema], default: [] },
    capturedAt: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  {
    collection: "reports",
    versionKey: false,
  },
);

ReportSchema.index(
  { farmerId: 1, submissionId: 1 },
  { unique: true },
);

export const ReportModel =
  mongoose.models.Report ||
  mongoose.model("Report", ReportSchema);