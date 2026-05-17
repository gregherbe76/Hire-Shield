import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "./app";

describe("Express app", () => {
  it("GET /api/healthz returns 200 ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("CORS is enabled (Access-Control-Allow-Origin header set)", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", "https://example.com");
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });

  it("parses JSON request bodies", async () => {
    // We don't exercise a real POST here (would require DB); we just ensure
    // the middleware doesn't crash on a JSON body to an unknown route.
    const res = await request(app)
      .post("/api/does-not-exist")
      .set("Content-Type", "application/json")
      .send({ foo: "bar" });
    expect(res.status).toBe(404);
  });
});
