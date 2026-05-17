import { describe, expect, it } from "vitest";
import { stylometrySignals } from "./stylometry";

describe("stylometrySignals", () => {
  it("flags excessive ALL-CAPS", () => {
    const text =
      "URGENT HIRING NOW! APPLY TODAY EARN BIG FAST EASY MONEY GUARANTEED.";
    const out = stylometrySignals(text);
    expect(out.some((s) => s.label === "Excessive ALL-CAPS")).toBe(true);
  });

  it("flags exclamation overload", () => {
    const text =
      "Apply now! Don't wait! Best job ever! Easy money! Big bucks! Hurry!";
    expect(
      stylometrySignals(text).some((s) => s.label === "Exclamation overload"),
    ).toBe(true);
  });

  it("returns no caps / exclamation flags on calm writing", () => {
    const text =
      "We are hiring a senior backend engineer to join our payments platform team. " +
      "You will design distributed services that process millions of transactions every day.";
    const out = stylometrySignals(text);
    expect(out.some((s) => s.label === "Excessive ALL-CAPS")).toBe(false);
    expect(out.some((s) => s.label === "Exclamation overload")).toBe(false);
  });

  it("returns an empty array for empty input", () => {
    expect(stylometrySignals("")).toEqual([]);
  });
});
