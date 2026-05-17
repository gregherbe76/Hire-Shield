import { describe, expect, it } from "vitest";
import { sentences, tokenize } from "./tokenize";

describe("tokenize", () => {
  it("lowercases and strips punctuation", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("removes stop-words", () => {
    expect(tokenize("the quick brown fox")).toEqual(["quick", "brown", "fox"]);
  });

  it("drops single-character tokens", () => {
    expect(tokenize("a b cd ef")).toEqual(["cd", "ef"]);
  });

  it("returns an empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("sentences", () => {
  it("splits on terminal punctuation", () => {
    expect(sentences("Hi there. How are you? Fine!")).toEqual([
      "Hi there.",
      "How are you?",
      "Fine!",
    ]);
  });

  it("trims whitespace and ignores empty segments", () => {
    expect(sentences("  One.   Two.   ")).toEqual(["One.", "Two."]);
  });
});
