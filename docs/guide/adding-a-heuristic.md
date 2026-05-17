# Adding a heuristic

Heuristics are the easiest place to contribute. Each one is a pure function
in `lib/nlp-engine/src/` with a focused responsibility and a sibling test
file.

This guide walks through adding a (made-up) **"compensation transparency"**
heuristic: penalize postings that mention salary range vaguely or not at all,
relative to the posting length.

## 1. Create the heuristic file

```ts
// lib/nlp-engine/src/comp-transparency.ts
import type { Signal } from "./types";

const SALARY_HINTS = [
  /\$\s?\d{2,3}[,k]\d{0,3}/i,        // $80,000 / $80k
  /\d{2,3}\s?-\s?\d{2,3}\s?k/i,      // 80-120k
  /salary range/i,
  /base (?:salary|pay)/i,
];

export function compTransparency(text: string): Signal | null {
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 80) return null;

  const hasSalary = SALARY_HINTS.some((re) => re.test(text));
  if (hasSalary) return null;

  const severity =
    wordCount > 500 ? "medium" : wordCount > 200 ? "low" : "info";

  return {
    kind: "comp_transparency",
    severity,
    scoreImpact: severity === "medium" ? 8 : severity === "low" ? 4 : 1,
    detail:
      "No salary range was detected. Long postings without compensation " +
      "information are a soft trust signal — ask the recruiter directly.",
  };
}
```

## 2. Add a test file

```ts
// lib/nlp-engine/src/comp-transparency.test.ts
import { describe, expect, it } from "vitest";
import { compTransparency } from "./comp-transparency";

describe("compTransparency", () => {
  it("returns null for short postings", () => {
    expect(compTransparency("Short blurb")).toBeNull();
  });

  it("returns null when a salary range is present", () => {
    const text = "Senior Engineer. ".repeat(40) + " Salary range $120-150k.";
    expect(compTransparency(text)).toBeNull();
  });

  it("flags long postings without compensation", () => {
    const text = "Responsibilities and growth opportunities. ".repeat(60);
    const signal = compTransparency(text);
    expect(signal).not.toBeNull();
    expect(signal!.kind).toBe("comp_transparency");
    expect(signal!.severity).toBe("medium");
  });
});
```

Run it:

```bash
pnpm --filter @workspace/nlp-engine test
```

## 3. Wire it into `analyze`

```ts
// lib/nlp-engine/src/analyze.ts
import { compTransparency } from "./comp-transparency";

export function runHeuristics(input: HeuristicsInput): Signal[] {
  const signals: Signal[] = [];
  // ... existing heuristics
  const comp = compTransparency(input.jobDescription);
  if (comp) signals.push(comp);
  return signals;
}
```

## 4. Export from the package

```ts
// lib/nlp-engine/src/index.ts
export * from "./comp-transparency";
```

## 5. Update the report UI (optional)

If the heuristic deserves a custom icon or grouping, edit
`artifacts/hireshield/src/components/analysis-report.tsx` and add a case
in the signal renderer. Otherwise it'll render with the default styling
based on its `severity`.

## 6. Open a PR

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(nlp): add compensation-transparency heuristic
```

The release workflow will pick it up automatically and bump the minor
version on the next release. See [CONTRIBUTING.md](https://github.com/gh63/hireshield/blob/main/CONTRIBUTING.md)
for the full PR checklist.

## Design rules for new heuristics

1. **Pure functions only.** No network, no filesystem, no time. Pass any
   dependencies as arguments.
2. **Bounded score impact.** Cap your contribution. A single heuristic
   should never single-handedly push a score below 30.
3. **Detail strings are candidate-facing.** Frame them as evidence, not
   accusations. *"This phrase often appears in..."* not *"This is a scam"*.
4. **Test every branch.** Heuristics are the core of the trust score —
   they're worth the coverage.
