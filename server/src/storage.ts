import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadBuffer(buffer: Buffer, name: string) {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "crop-reports",
          public_id: name,
          resource_type: "image",
          // limits stored size so the free quota lasts; boxes are normalized, so they still line up
          transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }],
        },
        (err, result) =>
          err || !result
            ? reject(err ?? new Error("Upload failed"))
            : resolve({ url: result.secure_url, publicId: result.public_id }),
      )
      .end(buffer);
  });
}

export async function deleteImages(publicIds: string[]) {
  await Promise.all(publicIds.map((id) => cloudinary.uploader.destroy(id).catch(() => undefined)));
}