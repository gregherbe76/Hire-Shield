const STOP_WORDS = new Set([
  "a","an","the","and","or","but","if","then","else","for","of","to","in","on","at","by","with","from","as","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","must","can","this","that","these","those","i","you","he","she","it","we","they","me","him","her","us","them","my","your","his","its","our","their","not","no","so","than","too","very","s","t","just","up","down","out","over","under","again","more","most","some","such","only","own","same","off","into","about",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
