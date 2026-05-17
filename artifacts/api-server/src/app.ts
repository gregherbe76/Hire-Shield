import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind the Replit shared proxy (and most production reverse proxies), the
// real client IP is in X-Forwarded-For. We need `req.ip` to be the caller's
// IP for per-IP rate limiting to work — but trusting *all* hops would let an
// attacker spoof X-Forwarded-For and rotate fake IPs to bypass limits.
//
// Default: trust exactly 1 upstream hop (the Replit shared proxy / typical
// CDN). Override with TRUST_PROXY when deploying behind multiple proxies.
// Accepts a hop count ("2"), a single subnet ("10.0.0.0/8"), a comma-
// separated list, or "false" to disable.
const trustProxyRaw = process.env["TRUST_PROXY"] ?? "1";
const trustProxy: number | string | boolean =
  trustProxyRaw === "false"
    ? false
    : /^\d+$/.test(trustProxyRaw)
      ? Number.parseInt(trustProxyRaw, 10)
      : trustProxyRaw;
app.set("trust proxy", trustProxy);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In standalone (Docker) production mode, also serve the built frontend.
// In Replit, the shared proxy handles frontend routing — set SERVE_STATIC=0 to disable.
const staticDir = process.env["STATIC_DIR"];
const serveStatic =
  process.env["SERVE_STATIC"] !== "0" &&
  process.env["NODE_ENV"] === "production" &&
  staticDir &&
  fs.existsSync(staticDir);

if (serveStatic && staticDir) {
  app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
  logger.info({ staticDir }, "Serving built frontend as static files");
}

export default app;
