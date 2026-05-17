import { describe, expect, it } from "vitest";
import { temporalSignals } from "./temporal";
import { postingFingerprint } from "./fingerprint";

const NOW = new Date("2026-05-17T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

describe("temporalSignals", () => {
  it("returns no signals when no postedAt and no history are provided", () => {
    expect(temporalSignals({ now: NOW })).toEqual([]);
  });

  it("ignores fresh postings (< 30 days)", () => {
    expect(temporalSignals({ postedAt: daysAgo(10), now: NOW })).toEqual([]);
  });

  it("flags a posting older than 30 days as low severity", () => {
    const signals = temporalSignals({ postedAt: daysAgo(45), now: NOW });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.severity).toBe("low");
    expect(signals[0]!.category).toBe("temporal");
  });

  it("flags a posting older than 60 days as medium severity", () => {
    const signals = temporalSignals({ postedAt: daysAgo(80), now: NOW });
    expect(signals[0]!.severity).toBe("medium");
    expect(signals[0]!.score).toBeGreaterThan(0);
  });

  it("flags a posting older than 120 days as high severity with strong score", () => {
    const signals = temporalSignals({ postedAt: daysAgo(180), now: NOW });
    expect(signals[0]!.severity).toBe("high");
    expect(signals[0]!.score).toBeGreaterThanOrEqual(12);
  });

  it("flags content republished across more than 21 days", () => {
    const signals = temporalSignals({
      now: NOW,
      history: {
        firstSeenAt: daysAgo(40),
        lastSeenAt: daysAgo(5),
        seenCount: 3,
      },
    });
    const republished = signals.find((s) =>
      s.label.toLowerCase().includes("republished"),
    );
    expect(republished).toBeDefined();
    expect(republished!.severity).toBe("medium");
  });

  it("escalates to high severity when same content is republished 4+ times", () => {
    const signals = temporalSignals({
      now: NOW,
      history: {
        firstSeenAt: daysAgo(60),
        lastSeenAt: daysAgo(2),
        seenCount: 5,
      },
    });
    const republished = signals.find((s) =>
      s.label.toLowerCase().includes("republished"),
    );
    expect(republished?.severity).toBe("high");
    expect(republished?.score).toBeGreaterThanOrEqual(14);
  });

  it("emits a low signal when seen 2+ times within the past 21 days", () => {
    const signals = temporalSignals({
      now: NOW,
      history: {
        firstSeenAt: daysAgo(7),
        lastSeenAt: daysAgo(1),
        seenCount: 2,
      },
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.severity).toBe("low");
    expect(signals[0]!.label).toMatch(/recently analyzed/i);
  });

  it("flags a posting that reappears after a long dormancy", () => {
    const signals = temporalSignals({
      now: NOW,
      history: {
        firstSeenAt: daysAgo(120),
        lastSeenAt: daysAgo(110),
        seenCount: 1,
      },
    });
    const reappeared = signals.find((s) =>
      s.label.toLowerCase().includes("reappeared"),
    );
    expect(reappeared).toBeDefined();
    expect(reappeared!.severity).toBe("medium");
  });

  it("stacks postedAt + history signals when both apply", () => {
    const signals = temporalSignals({
      postedAt: daysAgo(150),
      history: {
        firstSeenAt: daysAgo(140),
        lastSeenAt: daysAgo(10),
        seenCount: 4,
      },
      now: NOW,
    });
    // Old posting + republished 4× should produce two distinct signals.
    expect(signals.length).toBeGreaterThanOrEqual(2);
    expect(signals.every((s) => s.category === "temporal")).toBe(true);
  });

  it("ignores invalid dates safely", () => {
    expect(
      temporalSignals({ postedAt: new Date("not-a-date"), now: NOW }),
    ).toEqual([]);
  });
});

describe("postingFingerprint", () => {
  it("produces the same hash for identical normalized content", () => {
    const a = "We're hiring a Senior Engineer! Contact us at hr@acme.com.";
    const b = "  WE'RE   HIRING a senior engineer!!! Contact us at hr@acme.com  ";
    expect(postingFingerprint(a)).toBe(postingFingerprint(b));
  });

  it("produces different hashes for materially different content", () => {
    const a = "Senior backend engineer, Go, Kubernetes, $180k base.";
    const b = "Junior frontend developer, React, internship, $20/hour.";
    expect(postingFingerprint(a)).not.toBe(postingFingerprint(b));
  });

  it("returns a stable 64-char hex string", () => {
    const h = postingFingerprint("anything goes here");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
