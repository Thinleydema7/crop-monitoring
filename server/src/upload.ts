import multer from "multer";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const uploadPhoto = multer({
  // Hold the upload temporarily; save it after validating the report.
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
    fields: 10,
    fieldSize: 64 * 1024,
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error("Choose a JPEG, PNG, or WebP image."));
      return;
    }

    callback(null, true);
  },
}).single("photo");
