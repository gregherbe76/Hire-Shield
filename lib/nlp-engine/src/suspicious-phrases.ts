import type { HeuristicSignal } from "./types";

const SUSPICIOUS_PHRASES: { phrase: RegExp; weight: number; label: string }[] =
  [
    { phrase: /\bno experience (necessary|required|needed)\b/i, weight: 8, label: "Promises no experience required" },
    { phrase: /\bwork from home\b.*\b(easy|simple|guaranteed)\b/i, weight: 10, label: "Easy work-from-home framing" },
    { phrase: /\b(quick|easy|fast) (money|cash|income)\b/i, weight: 14, label: "Quick / easy money language" },
    { phrase: /\b\$[\d,]+\s*(per|\/)\s*(day|week|hour)\b/i, weight: 6, label: "Outsized guaranteed pay" },
    { phrase: /\bearn (up to )?\$?\d{3,}\b/i, weight: 8, label: "Inflated earnings claim" },
    { phrase: /\bguaranteed (income|pay|salary)\b/i, weight: 12, label: "Guaranteed income claim" },
    { phrase: /\bsend (your )?(resume|cv|details) (via|to|on) (whatsapp|telegram|signal|wechat)\b/i, weight: 22, label: "Off-platform contact requested" },
    { phrase: /\b(whatsapp|telegram|signal|wechat)\b/i, weight: 10, label: "Encrypted messenger contact" },
    { phrase: /\b(bitcoin|crypto|usdt|ethereum|nft|web3 ?wallet)\b/i, weight: 10, label: "Crypto payment references" },
    { phrase: /\bpay(ment)? (a|the) (fee|deposit|processing)\b/i, weight: 24, label: "Upfront fee or deposit" },
    { phrase: /\bbuy (your own )?equipment\b/i, weight: 14, label: "Asks candidate to buy equipment" },
    { phrase: /\b(personal|bank|ssn|social security) (information|details|number)\b/i, weight: 16, label: "Requests sensitive personal data" },
    { phrase: /\bmystery shopper\b/i, weight: 18, label: "Mystery shopper template" },
    { phrase: /\bpackage (forwarding|reshipping)\b/i, weight: 22, label: "Reshipping scam template" },
    { phrase: /\bdata entry\b.*\b(home|remote)\b/i, weight: 6, label: "Generic remote data-entry template" },
    { phrase: /\bdirect ?hire\b.*\bno interview\b/i, weight: 14, label: "Skips interview process" },
    { phrase: /\b(google|amazon|microsoft|apple)\b.*\bcontact (us|me) (on|via)\b/i, weight: 10, label: "Big-brand name dropped with off-channel contact" },
    { phrase: /\bdm me\b/i, weight: 6, label: "Casual 'DM me' contact" },
  ];

const TRUST_PHRASES: { phrase: RegExp; weight: number; label: string }[] = [
  { phrase: /\b(salary|compensation) range\b/i, weight: 4, label: "Discloses salary range" },
  { phrase: /\bequal opportunity\b/i, weight: 3, label: "Equal opportunity statement" },
  { phrase: /\bbenefits\b.*\b(health|dental|vision|401k|pto)\b/i, weight: 4, label: "Lists structured benefits" },
  { phrase: /\binterview process\b/i, weight: 3, label: "Describes interview process" },
];

export function suspiciousPhraseSignals(text: string): HeuristicSignal[] {
  const out: HeuristicSignal[] = [];
  for (const { phrase, weight, label } of SUSPICIOUS_PHRASES) {
    const m = text.match(phrase);
    if (m) {
      out.push({
        label,
        severity: weight >= 18 ? "high" : weight >= 10 ? "medium" : "low",
        category: "nlp",
        detail: `Matched language: "${m[0].slice(0, 120)}"`,
        score: weight,
      });
    }
  }
  for (const { phrase, weight, label } of TRUST_PHRASES) {
    const m = text.match(phrase);
    if (m) {
      out.push({
        label,
        severity: "info",
        category: "nlp",
        detail: `Trust indicator: "${m[0].slice(0, 120)}"`,
        score: -weight,
      });
    }
  }
  return out;
}
