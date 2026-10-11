import * as SQLite from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import type { Report } from "../../../shared/report";
import type { Submission } from "./report-upload";
import { uploadReport } from "./report-upload";
import { APIError, type Session } from "./api";
export type QueuedReport = {
  id: string;
  userId: string;
  payload: string;
  createdAt: string;
  lastError: string;
  blocked: number;
};
const database = SQLite.openDatabaseAsync("cropcare.db").then(async (db) => {
  await db.execAsync(
    `PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, userId TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL, lastError TEXT NOT NULL DEFAULT '', blocked INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS history (userId TEXT PRIMARY KEY, payload TEXT NOT NULL);`,
  );
  return db;
});
export async function enqueue(userId: string, submission: Submission) {
  const db = await database;
  const existing = await db.getFirstAsync<QueuedReport>(
    "SELECT * FROM queue WHERE id=?",
    submission.submissionId,
  );
  if (existing) return;
  const directory = new Directory(Paths.document, "cropcare-reports");
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, submission.submissionId + ".jpg");
  new File(submission.photo.uri).copy(destination);
  const payload = {
    ...submission,
    photo: { ...submission.photo, uri: destination.uri },
  };
  try {
    await db.runAsync(
      "INSERT INTO queue (id,userId,payload,createdAt) VALUES (?,?,?,?)",
      submission.submissionId,
      userId,
      JSON.stringify(payload),
      new Date().toISOString(),
    );
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
}
export async function getQueued(userId: string) {
  return (await database).getAllAsync<QueuedReport>(
    "SELECT * FROM queue WHERE userId=? ORDER BY createdAt DESC",
    userId,
  );
}
export async function removeQueued(item: QueuedReport) {
  await (
    await database
  ).runAsync("DELETE FROM queue WHERE id=? AND userId=?", item.id, item.userId);
  try {
    const file = new File(JSON.parse(item.payload).photo.uri);
    if (file.exists) file.delete();
  } catch {}
}
export async function retryQueued(userId: string) {
  await (
    await database
  ).runAsync("UPDATE queue SET blocked=0,lastError='' WHERE userId=?", userId);
}
export async function cacheReports(userId: string, reports: Report[]) {
  await (
    await database
  ).runAsync(
    "INSERT INTO history (userId,payload) VALUES (?,?) ON CONFLICT(userId) DO UPDATE SET payload=excluded.payload",
    userId,
    JSON.stringify(reports),
  );
}
export async function cachedReports(userId: string): Promise<Report[]> {
  const row = await (
    await database
  ).getFirstAsync<{ payload: string }>(
    "SELECT payload FROM history WHERE userId=?",
    userId,
  );
  return row ? JSON.parse(row.payload) : [];
}
let synchronizing: Promise<number> | null = null;
export function synchronize(session: Session): Promise<number> {
  if (synchronizing) return synchronizing;
  synchronizing = (async () => {
    let count = 0;
    const db = await database;
    for (const item of await getQueued(session.user.id)) {
      if (item.blocked) continue;
      try {
        await uploadReport(JSON.parse(item.payload), session.token);
        await removeQueued(item);
        count++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        const status = error instanceof APIError ? error.status : 0;
        await db.runAsync(
          "UPDATE queue SET lastError=?,blocked=? WHERE id=?",
          message,
          [400, 403, 413].includes(status) ? 1 : 0,
          item.id,
        );
        if (status === 401) throw error;
        if (status === 0 || status >= 500) break;
      }
    }
    return count;
  })().finally(() => {
    synchronizing = null;
  });
  return synchronizing;
}
