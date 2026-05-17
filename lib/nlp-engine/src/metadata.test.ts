import { describe, expect, it } from "vitest";
import { metadataSignals } from "./metadata";

describe("metadataSignals", () => {
  it("flags disposable email domains as high severity", () => {
    const out = metadataSignals({ recruiterEmail: "hr@mailinator.com" });
    const sig = out.find((s) => s.label === "Disposable email domain");
    expect(sig).toBeDefined();
    expect(sig!.severity).toBe("high");
  });

  it("flags free webmail addresses", () => {
    const out = metadataSignals({
      recruiterEmail: "jane.doe@gmail.com",
      company: "Acme Corp",
    });
    expect(out.some((s) => s.label === "Free webmail recruiter address")).toBe(
      true,
    );
  });

  it("rewards an email domain that matches the company name", () => {
    const out = metadataSignals({
      recruiterEmail: "talent@stripe.com",
      company: "Stripe Inc.",
    });
    const trust = out.find(
      (s) => s.label === "Recruiter email matches company domain",
    );
    expect(trust).toBeDefined();
    expect(trust!.score).toBeLessThan(0);
  });

  it("flags shortened job URLs", () => {
    const out = metadataSignals({ jobUrl: "https://bit.ly/abc123" });
    expect(out.some((s) => s.label === "Shortened job URL")).toBe(true);
  });

  it("flags raw IP addresses as host", () => {
    const out = metadataSignals({ jobUrl: "http://203.0.113.42/jobs/1" });
    expect(out.some((s) => s.label === "Raw IP address as host")).toBe(true);
  });

  it("notes missing recruiter contact without scoring it", () => {
    const out = metadataSignals({});
    const sig = out.find((s) => s.label === "No recruiter contact provided");
    expect(sig).toBeDefined();
    expect(sig!.score).toBe(0);
  });
});
