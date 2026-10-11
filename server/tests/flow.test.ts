import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createApp } from "../src/app.js";
const secret = "test-only-secret-abcdefghijklmnopqrstuvwxyz-12345";
test("connected reporting, retry deduplication, protected images, review conflicts and persistence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cropcare-test-"));
  const server = createApp(secret, directory).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api`;
  async function login(email: string, password: string) {
    const r = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(r.status, 200);
    return (await r.json()).token;
  }
  async function request(
    route: string,
    token?: string,
    options: RequestInit = {},
  ) {
    return fetch(base + route, {
      ...options,
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...options.headers,
      },
    });
  }
  try {
    assert.equal((await request("/reports")).status, 401);
    assert.equal((await request("/reports", "invalid-token")).status, 401);
    const farmer = await login("farmer@cropcare.test", "Farmer123!"),
      officer = await login("officer@cropcare.test", "Officer123!");
    const image = await sharp({
      create: { width: 100, height: 80, channels: 3, background: "#56a367" },
    })
      .png()
      .toBuffer();
    function body(id = "submission-test-001", badBox = false) {
      const form = new FormData();
      form.set("submissionId", id);
      form.set("crop", "Apple");
      form.set("source", "camera");
      form.set("capturedAt", new Date().toISOString());
      form.set(
        "location",
        JSON.stringify({
          latitude: 27.47,
          longitude: 89.64,
          accuracy: 12,
          recordedAt: new Date().toISOString(),
        }),
      );
      form.set("detectionMode", "simulated");
      form.set(
        "detections",
        JSON.stringify([
          {
            label: "Simulated region <test>",
            confidence: 0.86,
            box: { x: badBox ? 2 : 0.2, y: 0.2, width: 0.4, height: 0.4 },
          },
        ]),
      );
      form.set(
        "photo",
        new Blob([new Uint8Array(image)], { type: "image/png" }),
        "crop.png",
      );
      return form;
    }
    assert.equal(
      (await request("/reports", officer, { method: "POST", body: body() }))
        .status,
      403,
    );
    assert.equal(
      (
        await request("/reports", farmer, {
          method: "POST",
          body: body("bad-region", true),
        })
      ).status,
      400,
    );
    const responses = await Promise.all([
      request("/reports", farmer, { method: "POST", body: body() }),
      request("/reports", farmer, { method: "POST", body: body() }),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
    const [a, b] = await Promise.all(responses.map((r) => r.json()));
    assert.equal(a.report.id, b.report.id);
    const report = a.report;
    assert.equal(report.source, "camera");
    assert.equal(report.detectionMode, "simulated");
    assert.equal(report.image.annotated, true);
    assert.equal(
      (await (await request("/reports", farmer)).json()).reports.length,
      1,
    );
    assert.equal(
      (
        await (
          await request("/reports?status=pending&crop=Apple", officer)
        ).json()
      ).reports.length,
      1,
    );
    assert.equal((await readdir(path.join(directory, "images"))).length, 2);
    assert.equal((await request(`/reports/${report.id}/image`)).status, 401);
    const original = await request(`/reports/${report.id}/original`, officer);
    assert.equal(original.status, 200);
    assert.deepEqual(Buffer.from(await original.arrayBuffer()), image);
    const annotated = await request(`/reports/${report.id}/image`, farmer);
    assert.equal(annotated.status, 200);
    const metadata = await sharp(
      Buffer.from(await annotated.arrayBuffer()),
    ).metadata();
    assert.equal(metadata.width, 100);
    assert.equal(metadata.height, 80);
    const review = (token: string, version = 0) =>
      request(`/reports/${report.id}/reviews`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: "Officer assessment",
          recommendation: "Inspect and follow up.",
          version,
        }),
      });
    assert.equal((await review(farmer)).status, 403);
    assert.equal((await review(officer)).status, 201);
    assert.equal((await review(officer)).status, 409);
    assert.equal((await review(officer, 1)).status, 201);
    const details = (
      await (await request(`/reports/${report.id}`, farmer)).json()
    ).report;
    assert.equal(details.status, "reviewed");
    assert.equal(details.reviews.length, 2);
    assert.equal(details.reviews[0].recommendation, "Inspect and follow up.");
    assert.equal(
      (await request("/reports", farmer, { method: "POST", body: body() }))
        .status,
      200,
    );
    assert.equal((await readdir(path.join(directory, "images"))).length, 2);
    const persisted = JSON.parse(
      await readFile(path.join(directory, "reports.json"), "utf8"),
    );
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].reviews.length, 2);
    const restarted = createApp(secret, directory).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => restarted.on("listening", resolve));
    try {
      const result = await fetch(
        `http://127.0.0.1:${(restarted.address() as { port: number }).port}/api/reports`,
        { headers: { Authorization: "Bearer " + farmer } },
      );
      assert.equal((await result.json()).reports[0].reviews.length, 2);
    } finally {
      await new Promise<void>((resolve) => restarted.close(() => resolve()));
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
