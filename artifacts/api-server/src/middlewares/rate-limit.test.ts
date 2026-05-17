import { describe, expect, it } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { createRateLimit } from "./rate-limit";

function buildApp(opts: Parameters<typeof createRateLimit>[0]): Express {
  const app = express();
  app.set("trust proxy", true);
  app.post("/limited", createRateLimit(opts), (_req, res) => {
    res.status(201).json({ ok: true });
  });
  return app;
}

describe("createRateLimit", () => {
  it("allows requests under the per-IP hourly limit", async () => {
    const app = buildApp({ perIpHourly: 3, perIpDaily: 10, globalDaily: 100 });
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/limited")
        .set("X-Forwarded-For", "1.2.3.4");
      expect(res.status).toBe(201);
    }
  });

  it("returns 429 with Retry-After when per-IP hourly limit is exceeded", async () => {
    const app = buildApp({ perIpHourly: 2, perIpDaily: 10, globalDaily: 100 });
    await request(app).post("/limited").set("X-Forwarded-For", "1.2.3.4");
    await request(app).post("/limited").set("X-Forwarded-For", "1.2.3.4");
    const blocked = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "1.2.3.4");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(blocked.body.scope).toBe("ip-hourly");
    expect(blocked.body.retryAfter).toBeGreaterThan(0);
  });

  it("tracks limits independently per IP", async () => {
    const app = buildApp({ perIpHourly: 1, perIpDaily: 10, globalDaily: 100 });
    const a = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "1.1.1.1");
    expect(a.status).toBe(201);
    const aBlocked = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "1.1.1.1");
    expect(aBlocked.status).toBe(429);
    const b = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "2.2.2.2");
    expect(b.status).toBe(201);
  });

  it("enforces the per-IP daily cap above the hourly cap", async () => {
    // Simulate hours passing by advancing the injected clock between calls.
    let t = 1_000_000_000_000;
    const app = express();
    app.set("trust proxy", true);
    app.post(
      "/limited",
      createRateLimit({
        perIpHourly: 100,
        perIpDaily: 3,
        globalDaily: 100,
        now: () => t,
      }),
      (_req, res) => res.status(201).json({ ok: true }),
    );

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/limited")
        .set("X-Forwarded-For", "9.9.9.9");
      expect(res.status).toBe(201);
      t += 60 * 60 * 1000 + 1; // jump >1 hour so hourly window resets
    }
    const blocked = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "9.9.9.9");
    expect(blocked.status).toBe(429);
    expect(blocked.body.scope).toBe("ip-daily");
  });

  it("trips the global daily circuit breaker across IPs", async () => {
    const app = buildApp({ perIpHourly: 100, perIpDaily: 100, globalDaily: 2 });
    const a = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "10.0.0.1");
    expect(a.status).toBe(201);
    const b = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "10.0.0.2");
    expect(b.status).toBe(201);
    const blocked = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "10.0.0.3");
    expect(blocked.status).toBe(429);
    expect(blocked.body.scope).toBe("global");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("resets the per-IP hourly window after the hour elapses", async () => {
    let t = 1_700_000_000_000;
    const app = express();
    app.set("trust proxy", true);
    app.post(
      "/limited",
      createRateLimit({
        perIpHourly: 1,
        perIpDaily: 100,
        globalDaily: 100,
        now: () => t,
      }),
      (_req, res) => res.status(201).json({ ok: true }),
    );

    const first = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "5.5.5.5");
    expect(first.status).toBe(201);
    const blocked = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "5.5.5.5");
    expect(blocked.status).toBe(429);
    t += 60 * 60 * 1000 + 1;
    const allowed = await request(app)
      .post("/limited")
      .set("X-Forwarded-For", "5.5.5.5");
    expect(allowed.status).toBe(201);
  });

  it("disables a limit when its value is 0", async () => {
    const app = buildApp({ perIpHourly: 0, perIpDaily: 0, globalDaily: 0 });
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/limited")
        .set("X-Forwarded-For", "7.7.7.7");
      expect(res.status).toBe(201);
    }
  });
});
