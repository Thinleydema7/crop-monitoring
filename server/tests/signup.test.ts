import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";
import { ReportStore } from "../src/report.js";
const secret = "signup-test-secret-abcdefghijklmnopqrstuvwxyz-12345";
test("farmer registration validates, prevents concurrent duplicates, persists and isolates accounts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cropcare-signup-"));
  let server = createApp(secret, directory).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  let base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const input = {
    name: "New Farmer",
    email: "new.farmer@example.test",
    password: "SecureFarm123!",
    passwordConfirmation: "SecureFarm123!",
  };
  const register = (body: object) =>
    fetch(base + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    for (const invalid of [
      { ...input, name: " " },
      { ...input, email: "invalid" },
      { ...input, password: "short", passwordConfirmation: "short" },
      { ...input, passwordConfirmation: "different" },
      { ...input, role: "officer" },
      {
        ...input,
        password: "é".repeat(40),
        passwordConfirmation: "é".repeat(40),
      },
    ])
      assert.equal((await register(invalid)).status, 400);
    assert.equal(
      (await register({ ...input, email: "OFFICER@CROPCARE.TEST" })).status,
      409,
    );
    const concurrent = await Promise.all([
      register(input),
      register({ ...input, email: " NEW.FARMER@EXAMPLE.TEST " }),
    ]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
    const session = await concurrent.find((r) => r.status === 201)!.json();
    assert.equal(session.user.role, "farmer");
    assert.equal(session.user.email, input.email);
    assert.equal(session.user.passwordHash, undefined);
    const stored = JSON.parse(
      await readFile(path.join(directory, "users.json"), "utf8"),
    );
    assert.equal(stored.length, 1);
    assert.notEqual(stored[0].passwordHash, input.password);
    assert.match(stored[0].passwordHash, /^\$2/);
    assert.equal(stored[0].password, undefined);
    const me = await fetch(base + "/auth/me", {
      headers: { Authorization: "Bearer " + session.token },
    });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.id, session.user.id);
    const fakeReport: any = {
      id: "another-farmers-report",
      submissionId: "existing-demo-report",
      farmerId: "farmer-demo",
      crop: "Rice",
      source: "gallery",
      image: {
        filename: "unused.jpg",
        mimeType: "image/jpeg",
        width: 1,
        height: 1,
        annotated: false,
      },
      location: {
        latitude: 0,
        longitude: 0,
        accuracy: null,
        recordedAt: new Date().toISOString(),
      },
      detections: [],
      detectionMode: "none",
      status: "pending",
      reviews: [],
      createdAt: new Date().toISOString(),
      capturedAt: new Date().toISOString(),
    };
    await new ReportStore(directory).save(fakeReport);
    const headers = { Authorization: "Bearer " + session.token };
    assert.equal(
      (await (await fetch(base + "/reports", { headers })).json()).reports
        .length,
      0,
    );
    assert.equal(
      (await fetch(base + "/reports/another-farmers-report", { headers }))
        .status,
      404,
    );
    assert.equal(
      (await fetch(base + "/reports/another-farmers-report/image", { headers }))
        .status,
      404,
    );
    assert.equal(
      (
        await fetch(base + "/reports/another-farmers-report/reviews", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            diagnosis: "fake",
            recommendation: "fake",
            version: 0,
          }),
        })
      ).status,
      403,
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server = createApp(secret, directory).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.on("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
    const signedIn = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password }),
    });
    assert.equal(signedIn.status, 200);
    assert.equal((await signedIn.json()).user.id, session.user.id);
    assert.equal((await fetch(base + "/auth/me", { headers })).status, 200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
