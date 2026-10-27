/*
import express from "express";
import cors from "cors";
import path from "node:path";
import { createAuth, RegistrationError } from "./auth.js";
import { requireAuth } from "./middleware.js";
import { ReportStore } from "./report.js";
import { createSubmitReport } from "./submit-report.js";
export function createApp(
  secret: string,
  storageDirectory = path.resolve("storage"),
  webDirectory = path.resolve("../web"),
) {
  const app = express(),
    store = new ReportStore(storageDirectory),
    auth = createAuth(secret, storageDirectory),
    protect = requireAuth(secret, auth.findUserById);
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/reports/:id/:variant", protect, async (req, res) => {
  const variant = String(req.params.variant);
  if (!["image", "original"].includes(variant)) {
    res.status(404).json({ message: "Not found." });
    return;
  }
  const img = await store.getImage(String(req.params.id));
  if (!img || (res.locals.user.role === "farmer" && img.farmerId !== res.locals.user.id)) {
    res.status(404).json({ message: "Image not found." });
    return;
  }
  const url = variant === "original" ? img.originalUrl : img.url;
  const upstream = url ? await fetch(url) : null;
  if (!upstream?.ok) {
    res.status(502).json({ message: "Image is temporarily unavailable." });
    return;
  }
  res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(Buffer.from(await upstream.arrayBuffer()));
});
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      password.length > 128
    ) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }
    const session = await auth.login(email, password);
    if (!session) {
      res.status(401).json({ message: "Incorrect email or password." });
      return;
    }
    res.json(session);
  });
  app.post("/api/auth/register", async (req, res) => {
    try {
      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        res.status(400).json({ message: "Enter your registration details." });
        return;
      }
      res.status(201).json(await auth.register(req.body));
    } catch (error) {
      if (error instanceof RegistrationError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      throw error;
    }
  });
  app.get("/api/auth/me", protect, (_req, res) =>
    res.json({ user: res.locals.user }),
  );
  app.get("/api/reports", protect, async (req, res) => {
    const user = res.locals.user;
    let reports = await store.list(
      user.role === "farmer" ? user.id : undefined,
    );
    const { status, crop } = req.query;
    if (typeof status === "string" && status)
      reports = reports.filter((r) => r.status === status);
    if (typeof crop === "string" && crop)
      reports = reports.filter((r) => r.crop === crop);
    res.json({ reports });
  });
  app.post("/api/reports", protect, createSubmitReport(store));
  app.get("/api/reports/:id", protect, async (req, res) => {
    const report = await store.get(String(req.params.id));
    if (
      !report ||
      (res.locals.user.role === "farmer" &&
        report.farmerId !== res.locals.user.id)
    ) {
      res.status(404).json({ message: "Report not found." });
      return;
    }
    res.json({ report });
  });
  app.get("/api/reports/:id/:variant", protect, async (req, res) => {
    if (!["image", "original"].includes(String(req.params.variant))) {
      res.status(404).json({ message: "Not found." });
      return;
    }
    const report = await store.get(String(req.params.id));
    if (
      !report ||
      (res.locals.user.role === "farmer" &&
        report.farmerId !== res.locals.user.id)
    ) {
      res.status(404).json({ message: "Image not found." });
      return;
    }
    const filename =
      req.params.variant === "original"
        ? (report.image.originalFilename ?? report.image.filename)
        : report.image.filename;
    if (path.basename(filename) !== filename) {
      res.status(500).json({ message: "Invalid image record." });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(path.resolve(store.directory, "images", filename));
  });
  app.post("/api/reports/:id/reviews", protect, async (req, res) => {
    if (res.locals.user.role !== "officer") {
      res.status(403).json({ message: "Only officers can review reports." });
      return;
    }
    const { diagnosis, recommendation, version } = req.body ?? {};
    if (
      typeof diagnosis !== "string" ||
      !diagnosis.trim() ||
      diagnosis.length > 2000 ||
      typeof recommendation !== "string" ||
      !recommendation.trim() ||
      recommendation.length > 5000 ||
      !Number.isInteger(version) ||
      version < 0
    ) {
      res
        .status(400)
        .json({ message: "Diagnosis and recommendation are required." });
      return;
    }
    const result = await store.review(
      String(req.params.id),
      res.locals.user.id,
      diagnosis.trim(),
      recommendation.trim(),
      version,
    );
    if (result.kind === "missing") {
      res.status(404).json({ message: "Report not found." });
      return;
    }
    if (result.kind === "conflict") {
      res.status(409).json({
        message: "Another review was saved. Refresh this report before saving.",
      });
      return;
    }
    res.status(201).json({ report: result.report });
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API endpoint not found." });
  });
  app.use(express.static(webDirectory));
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      if (!res.headersSent)
        res
          .status(500)
          .json({ message: "The server could not complete this request." });
    },
  );
  return app;
}
*/


import express from "express";
import cors from "cors";
import path from "node:path";
import { createAuth, RegistrationError } from "./auth.js";
import { requireAuth } from "./middleware.js";
import { ReportStore } from "./report.js";
import { createSubmitReport } from "./submit-report.js";

export function createApp(
  secret: string,
  _storageDirectory?: string,
  webDirectory = path.resolve("../web"),
) {
  const app = express(),
    store = new ReportStore(),
    auth = createAuth(secret),
    protect = requireAuth(secret, auth.findUserById);

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      password.length > 128
    ) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const session = await auth.login(email, password);

    if (!session) {
      res.status(401).json({ message: "Incorrect email or password." });
      return;
    }

    res.json(session);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        res.status(400).json({ message: "Enter your registration details." });
        return;
      }

      res.status(201).json(await auth.register(req.body));
    } catch (error) {
      if (error instanceof RegistrationError) {
        res.status(error.status).json({ message: error.message });
        return;
      }

      throw error;
    }
  });

  app.get("/api/auth/me", protect, (_req, res) =>
    res.json({ user: res.locals.user }),
  );

  app.get("/api/reports", protect, async (req, res) => {
    const user = res.locals.user;

    let reports = await store.list(
      user.role === "farmer" ? user.id : undefined,
    );

    const { status, crop } = req.query;

    if (typeof status === "string" && status) {
      reports = reports.filter((r) => r.status === status);
    }

    if (typeof crop === "string" && crop) {
      reports = reports.filter((r) => r.crop === crop);
    }

    res.json({ reports });
  });

  app.post("/api/reports", protect, createSubmitReport(store));

  app.get("/api/reports/:id", protect, async (req, res) => {
    const report = await store.get(String(req.params.id));

    if (
      !report ||
      (res.locals.user.role === "farmer" &&
        report.farmerId !== res.locals.user.id)
    ) {
      res.status(404).json({ message: "Report not found." });
      return;
    }

    res.json({ report });
  });

  app.get("/api/reports/:id/:variant", protect, async (req, res) => {
    const variant = String(req.params.variant);

    if (!["image", "original"].includes(variant)) {
      res.status(404).json({ message: "Not found." });
      return;
    }

    const img = await store.getImage(String(req.params.id));

    if (
      !img ||
      (res.locals.user.role === "farmer" &&
        img.farmerId !== res.locals.user.id)
    ) {
      res.status(404).json({ message: "Image not found." });
      return;
    }

    const url = variant === "original" ? img.originalUrl : img.url;
    const upstream = url ? await fetch(url) : null;

    if (!upstream?.ok) {
      res.status(502).json({
        message: "Image is temporarily unavailable.",
      });
      return;
    }

    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ?? "image/jpeg",
    );
    res.setHeader("Cache-Control", "private, no-store");

    res.send(Buffer.from(await upstream.arrayBuffer()));
  });

  app.post("/api/reports/:id/reviews", protect, async (req, res) => {
    if (res.locals.user.role !== "officer") {
      res.status(403).json({ message: "Only officers can review reports." });
      return;
    }

    const { diagnosis, recommendation, version } = req.body ?? {};

    if (
      typeof diagnosis !== "string" ||
      !diagnosis.trim() ||
      diagnosis.length > 2000 ||
      typeof recommendation !== "string" ||
      !recommendation.trim() ||
      recommendation.length > 5000 ||
      !Number.isInteger(version) ||
      version < 0
    ) {
      res.status(400).json({
        message: "Diagnosis and recommendation are required.",
      });
      return;
    }

    const result = await store.review(
      String(req.params.id),
      res.locals.user.id,
      diagnosis.trim(),
      recommendation.trim(),
      version,
    );

    if (result.kind === "missing") {
      res.status(404).json({ message: "Report not found." });
      return;
    }

    if (result.kind === "conflict") {
      res.status(409).json({
        message: "Another review was saved. Refresh this report before saving.",
      });
      return;
    }

    res.status(201).json({ report: result.report });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API endpoint not found." });
  });

  app.use(express.static(webDirectory));

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);

      if (!res.headersSent) {
        res.status(500).json({
          message: "The server could not complete this request.",
        });
      }
    },
  );

  return app;
}
