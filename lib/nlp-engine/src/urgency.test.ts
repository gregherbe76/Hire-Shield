import { describe, expect, it } from "vitest";
import { urgencySignals } from "./urgency";

describe("urgencySignals", () => {
  it("returns nothing for neutral copy", () => {
    expect(
      urgencySignals(
        "We are looking for a thoughtful engineer to join our payments team.",
      ),
    ).toEqual([]);
  });

  it("flags low severity for a single cue", () => {
    const out = urgencySignals("Apply now for our new role.");
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe("low");
    expect(out[0]!.score).toBeGreaterThan(0);
  });

  it("escalates to high severity at 3+ cues", () => {
    const out = urgencySignals(
      "URGENT hire! Apply now, start tomorrow — limited spots, hurry!",
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe("high");
    expect(out[0]!.score).toBeGreaterThanOrEqual(13);
  });

  it("is case-insensitive", () => {
    expect(urgencySignals("APPLY NOW")).toHaveLength(1);
    expect(urgencySignals("apply now")).toHaveLength(1);
  });
});
