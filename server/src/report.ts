import { randomUUID } from "node:crypto";
import type { Report } from "../../shared/report.js";
import { ReportModel } from "./models.js";

export type StoredReport = Report & {
  image: { url: string; originalUrl: string; publicId: string; originalPublicId: string };
};

// Convert a Mongo document to the exact Report shape the apps already expect
function toReport(doc: any): Report {
  const { _id, image, ...rest } = doc;
  const { url, originalUrl, publicId, originalPublicId, ...publicImage } = image ?? {};
  return { id: _id, image: publicImage, ...rest } as Report;
}

export class ReportStore {
  async list(farmerId?: string) {
    const docs = await ReportModel.find(farmerId ? { farmerId } : {})
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toReport);
  }

  async get(id: string) {
    const doc = await ReportModel.findById(id).lean();
    return doc ? toReport(doc) : undefined;
  }

  // used only by the authenticated image route
  async getImage(id: string) {
    const d: any = await ReportModel.findById(id).select("farmerId image").lean();
    return d ? { farmerId: d.farmerId as string, url: d.image?.url, originalUrl: d.image?.originalUrl } : null;
  }

  async save(report: StoredReport): Promise<Report> {
    const { id, ...rest } = report;
    try {
      const created = await ReportModel.create({ _id: id, ...rest });
      return toReport(created.toObject());
    } catch (e: any) {
      if (e.code === 11000) {
        // same farmer + submissionId already saved: return the existing one
        const existing = await ReportModel.findOne({
          farmerId: report.farmerId,
          submissionId: report.submissionId,
        }).lean();
        if (existing) return toReport(existing);
      }
      throw e;
    }
  }

  async review(id: string, officerId: string, diagnosis: string, recommendation: string, version: number) {
    // Version check and update happen in one atomic step: this is your conflict protection
    const updated = await ReportModel.findOneAndUpdate(
      { _id: id, version },
      {
        $push: {
          reviews: { id: randomUUID(), officerId, diagnosis, recommendation, createdAt: new Date().toISOString() },
        },
        $set: { status: "reviewed" },
        $inc: { version: 1 },
      },
      { new: true },
    ).lean();
    if (updated) return { kind: "saved" as const, report: toReport(updated) };
    return (await ReportModel.exists({ _id: id }))
      ? { kind: "conflict" as const }
      : { kind: "missing" as const };
  }
}