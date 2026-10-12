
import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["farmer", "officer"],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    collection: "users",
    timestamps: true,
    versionKey: false,
  },
);

export const UserModel =
  mongoose.models.User ||
  mongoose.model("User", UserSchema);
