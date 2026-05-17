import { createHash } from "node:crypto";

/**
 * Stable content fingerprint for a job posting.
 *
 * Lowercases, strips punctuation, collapses whitespace, and truncates to a
 * fixed prefix before hashing. The same description posted twice (or copy-
 * pasted with minor formatting differences) produces the same hash. Used by
 * the API server to detect republication patterns and feed the temporal
 * heuristics.
 */
export function postingFingerprint(description: string): string {
  const normalized = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  return createHash("sha256").update(normalized).digest("hex");
}
