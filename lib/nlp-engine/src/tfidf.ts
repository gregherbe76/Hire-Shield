import { tokenize } from "./tokenize";

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const len = tokens.length || 1;
  for (const [k, v] of tf) tf.set(k, v / len);
  return tf;
}

export function inverseDocumentFrequency(
  docsTokens: string[][],
): Map<string, number> {
  const N = docsTokens.length;
  const df = new Map<string, number>();
  for (const tokens of docsTokens) {
    const seen = new Set(tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [k, v] of df) idf.set(k, Math.log((1 + N) / (1 + v)) + 1);
  return idf;
}

export function tfidfVector(
  tokens: string[],
  idf: Map<string, number>,
): Map<string, number> {
  const tf = termFrequency(tokens);
  const vec = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    vec.set(term, tfVal * (idf.get(term) ?? 1));
  }
  return vec;
}

export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, va] of a) {
    na += va * va;
    const vb = b.get(k);
    if (vb !== undefined) dot += va * vb;
  }
  for (const [, vb] of b) nb += vb * vb;
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function similarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const idf = inverseDocumentFrequency([ta, tb]);
  return cosineSimilarity(tfidfVector(ta, idf), tfidfVector(tb, idf));
}
