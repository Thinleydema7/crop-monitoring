import { randomUUID } from "node:crypto";
import { ReportModel } from "./report-model.js";
import type { Report } from "../../shared/report.js";

export class MongoReportStore {
  constructor(public directory: string) {}

  async list(farmerId?: string): Promise<Report[]> {
    const filter = farmerId ? { farmerId } : {};

    const reports = await ReportModel.find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return reports as unknown as Report[];
  }

  async get(id: string): Promise<Report | undefined> {
    const report = await ReportModel.findOne({ id }).lean().exec();

    return (report as unknown as Report | null) ?? undefined;
  }

  async save(report: Report): Promise<Report> {
    // Avoid saving the same farmer submission more than once.
    const existing = await ReportModel.findOne({
      farmerId: report.farmerId,
      submissionId: report.submissionId,
    })
      .lean()
      .exec();

    if (existing) {
      return existing as unknown as Report;
    }

    try {
      const saved = await ReportModel.create(report);
      return saved.toObject() as unknown as Report;
    } catch (error) {
      // Handle simultaneous duplicate submissions safely.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        const duplicate = await ReportModel.findOne({
          farmerId: report.farmerId,
          submissionId: report.submissionId,
        })
          .lean()
          .exec();

        if (duplicate) {
          return duplicate as unknown as Report;
        }
      }

      throw error;
    }
  }

  async review(
    id: string,
    officerId: string,
    diagnosis: string,
    recommendation: string,
    version: number,
  ) {
    const review = {
      id: randomUUID(),
      officerId,
      diagnosis,
      recommendation,
      createdAt: new Date().toISOString(),
    };

    // Only update the report if its version still matches.
    const report = await ReportModel.findOneAndUpdate(
      { id, version },
      {
        $push: { reviews: review },
        $set: { status: "reviewed" },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true },
    ).exec();

    if (report) {
      return {
        kind: "saved" as const,
        report: report.toObject() as unknown as Report,
      };
    }

    const exists = await ReportModel.exists({ id });

    if (!exists) {
      return { kind: "missing" as const };
    }

    return { kind: "conflict" as const };
  }
}
