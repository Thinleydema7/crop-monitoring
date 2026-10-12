import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Report } from "../../shared/report.js";

export class ReportStore {
  private queue: Promise<void> = Promise.resolve();
  constructor(public directory: string) {}
  private locked<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  private async read(): Promise<Report[]> {
    await mkdir(this.directory, { recursive: true });
    try {
      const value = JSON.parse(
        await readFile(path.join(this.directory, "reports.json"), "utf8"),
      );
      if (!Array.isArray(value)) throw new Error("Invalid reports storage");
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  private async write(reports: Report[]) {
    const temporary = path.join(this.directory, randomUUID() + ".tmp");
    try {
      await writeFile(temporary, JSON.stringify(reports, null, 2), {
        mode: 0o600,
      });
      await rename(temporary, path.join(this.directory, "reports.json"));
    } finally {
      await rm(temporary, { force: true });
    }
  }
  list(farmerId?: string) {
    return this.locked(async () =>
      (await this.read())
        .filter((r) => !farmerId || r.farmerId === farmerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  get(id: string) {
    return this.locked(async () =>
      (await this.read()).find((r) => r.id === id),
    );
  }
  save(report: Report) {
    return this.locked(async () => {
      const reports = await this.read();
      const existing = reports.find(
        (r) =>
          r.farmerId === report.farmerId &&
          r.submissionId === report.submissionId,
      );
      if (existing) return existing;
      reports.push(report);
      await this.write(reports);
      return report;
    });
  }
  review(
    id: string,
    officerId: string,
    diagnosis: string,
    recommendation: string,
    version: number,
  ) {
    return this.locked(async () => {
      const reports = await this.read();
      const report = reports.find((r) => r.id === id);
      if (!report) return { kind: "missing" as const };
      if ((report.version ?? 0) !== version)
        return { kind: "conflict" as const };
      report.reviews.push({
        id: randomUUID(),
        officerId,
        diagnosis,
        recommendation,
        createdAt: new Date().toISOString(),
      });
      report.status = "reviewed";
      report.version = version + 1;
      await this.write(reports);
      return { kind: "saved" as const, report };
    });
  }
}
