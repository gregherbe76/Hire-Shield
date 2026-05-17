import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface RateLimitOptions {
  perIpHourly: number;
  perIpDaily: number;
  globalDaily: number;
  now?: () => number;
}

interface IpBucket {
  hourTimestamps: number[];
  dayTimestamps: number[];
}

interface GlobalBucket {
  dayStart: number;
  count: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function defaultRateLimitOptions(): RateLimitOptions {
  return {
    perIpHourly: readIntEnv("RATE_LIMIT_PER_IP_HOURLY", 10),
    perIpDaily: readIntEnv("RATE_LIMIT_PER_IP_DAILY", 30),
    globalDaily: readIntEnv("RATE_LIMIT_GLOBAL_DAILY", 500),
  };
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function pruneOlderThan(timestamps: number[], cutoff: number): number[] {
  let i = 0;
  while (i < timestamps.length && timestamps[i]! < cutoff) i++;
  return i === 0 ? timestamps : timestamps.slice(i);
}

// Periodically sweep IP buckets so the map can't grow unbounded under
// high-cardinality traffic. We piggy-back on incoming requests rather than
// using a timer so we don't keep the event loop alive in tests / shutdown.
const SWEEP_EVERY = 256;

export function createRateLimit(opts: RateLimitOptions): RequestHandler {
  const ipBuckets = new Map<string, IpBucket>();
  const global: GlobalBucket = { dayStart: 0, count: 0 };
  const now = opts.now ?? Date.now;
  let sinceLastSweep = 0;

  return function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const t = now();
    const ip = clientIp(req);

    sinceLastSweep += 1;
    if (sinceLastSweep >= SWEEP_EVERY) {
      sinceLastSweep = 0;
      const hourCutoff = t - HOUR_MS;
      const dayCutoff = t - DAY_MS;
      for (const [key, b] of ipBuckets) {
        b.hourTimestamps = pruneOlderThan(b.hourTimestamps, hourCutoff);
        b.dayTimestamps = pruneOlderThan(b.dayTimestamps, dayCutoff);
        if (
          b.hourTimestamps.length === 0 &&
          b.dayTimestamps.length === 0
        ) {
          ipBuckets.delete(key);
        }
      }
    }

    // Global daily circuit breaker.
    if (global.dayStart === 0 || t - global.dayStart >= DAY_MS) {
      global.dayStart = t;
      global.count = 0;
    }
    if (opts.globalDaily > 0 && global.count >= opts.globalDaily) {
      const retryAfter = Math.max(
        1,
        Math.ceil((global.dayStart + DAY_MS - t) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error:
          "HireShield has hit its daily analysis cap. Please try again tomorrow.",
        retryAfter,
        scope: "global",
      });
      return;
    }

    // Per-IP sliding windows.
    const bucket: IpBucket = ipBuckets.get(ip) ?? {
      hourTimestamps: [],
      dayTimestamps: [],
    };
    bucket.hourTimestamps = pruneOlderThan(bucket.hourTimestamps, t - HOUR_MS);
    bucket.dayTimestamps = pruneOlderThan(bucket.dayTimestamps, t - DAY_MS);

    if (
      opts.perIpHourly > 0 &&
      bucket.hourTimestamps.length >= opts.perIpHourly
    ) {
      const oldest = bucket.hourTimestamps[0]!;
      const retryAfter = Math.max(1, Math.ceil((oldest + HOUR_MS - t) / 1000));
      ipBuckets.set(ip, bucket);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error:
          "Too many analyses from this IP this hour. Please slow down and try again shortly.",
        retryAfter,
        scope: "ip-hourly",
      });
      return;
    }
    if (
      opts.perIpDaily > 0 &&
      bucket.dayTimestamps.length >= opts.perIpDaily
    ) {
      const oldest = bucket.dayTimestamps[0]!;
      const retryAfter = Math.max(1, Math.ceil((oldest + DAY_MS - t) / 1000));
      ipBuckets.set(ip, bucket);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error:
          "Daily analysis limit reached from this IP. Please try again tomorrow.",
        retryAfter,
        scope: "ip-daily",
      });
      return;
    }

    bucket.hourTimestamps.push(t);
    bucket.dayTimestamps.push(t);
    ipBuckets.set(ip, bucket);
    global.count += 1;

    next();
  };
}
