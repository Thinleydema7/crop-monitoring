import { File } from "expo-file-system";
import type { Crop, Report, ReportLocation } from "../../../shared/report";
import type { AnalyzedPhoto } from "./detector";
import { request } from "./api";
export type Submission = {
  submissionId: string;
  crop: Crop;
  photo: AnalyzedPhoto;
  location: ReportLocation;
};
export async function uploadReport(
  submission: Submission,
  token: string,
): Promise<Report> {
  const form = new FormData();
  form.append("submissionId", submission.submissionId);
  form.append("crop", submission.crop);
  form.append("capturedAt", submission.photo.capturedAt);
  form.append("source", submission.photo.source);
  form.append("location", JSON.stringify(submission.location));
  form.append("detections", JSON.stringify(submission.photo.detections));
  form.append("detectionMode", submission.photo.detectionMode);
  form.append("photo", new File(submission.photo.uri), "crop-photo.jpg");
  return (
    await request<{ report: Report }>("/reports", token, {
      method: "POST",
      body: form,
    }, 60000)
  ).report;
}
