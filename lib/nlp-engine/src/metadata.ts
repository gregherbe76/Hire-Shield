import type { HeuristicSignal } from "./types";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","10minutemail.com","tempmail.com","yopmail.com",
  "trashmail.com","sharklasers.com","getnada.com","throwaway.email","mintemail.com",
  "fakeinbox.com","dispostable.com","mailnesia.com","emailondeck.com",
]);

const FREE_DOMAINS = new Set([
  "gmail.com","yahoo.com","yahoo.co.uk","hotmail.com","outlook.com","aol.com","icloud.com","live.com","proton.me","protonmail.com","gmx.com","mail.com","yandex.com","zoho.com",
]);

const SUSPICIOUS_TLDS = new Set([
  "zip","mov","top","click","work","loan","country","gq","tk","ml","cf","ga","xyz","rest",
]);

const URL_SHORTENERS = new Set([
  "bit.ly","tinyurl.com","t.co","goo.gl","is.gd","buff.ly","ow.ly","cutt.ly","rebrand.ly","shorturl.at",
]);

function emailDomain(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^[^@\s]+@([^@\s]+)$/);
  return m ? m[1] : null;
}

function hostname(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function tld(host: string): string {
  const parts = host.split(".");
  return parts[parts.length - 1] ?? "";
}

function tokenizeCompany(company: string): string[] {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|company|gmbh|ag|sa|plc)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function metadataSignals(input: {
  recruiterEmail?: string;
  jobUrl?: string;
  company?: string;
}): HeuristicSignal[] {
  const signals: HeuristicSignal[] = [];

  if (input.recruiterEmail) {
    const dom = emailDomain(input.recruiterEmail);
    if (!dom) {
      signals.push({
        label: "Recruiter email is malformed",
        severity: "medium",
        category: "metadata",
        detail: `Could not parse a valid domain from "${input.recruiterEmail}".`,
        score: 8,
      });
    } else {
      if (DISPOSABLE_DOMAINS.has(dom)) {
        signals.push({
          label: "Disposable email domain",
          severity: "high",
          category: "metadata",
          detail: `${dom} is a known disposable / throwaway email provider.`,
          score: 25,
        });
      } else if (FREE_DOMAINS.has(dom)) {
        signals.push({
          label: "Free webmail recruiter address",
          severity: "medium",
          category: "metadata",
          detail: `Recruiter contact uses ${dom}, not a corporate domain.`,
          score: 12,
        });
      } else if (SUSPICIOUS_TLDS.has(tld(dom))) {
        signals.push({
          label: "Unusual recruiter TLD",
          severity: "medium",
          category: "metadata",
          detail: `Recruiter domain uses .${tld(dom)} — uncommon for legitimate employers.`,
          score: 10,
        });
      } else if (input.company) {
        const compTokens = tokenizeCompany(input.company);
        const matches = compTokens.some((t) => dom.includes(t));
        if (matches) {
          signals.push({
            label: "Recruiter email matches company domain",
            severity: "info",
            category: "metadata",
            detail: `${dom} aligns with the stated company name.`,
            score: -10,
          });
        } else if (compTokens.length > 0) {
          signals.push({
            label: "Recruiter domain does not match company",
            severity: "low",
            category: "metadata",
            detail: `${dom} doesn't reflect "${input.company}" — not always suspicious, but worth verifying.`,
            score: 4,
          });
        }
      }
    }
  } else {
    signals.push({
      label: "No recruiter contact provided",
      severity: "info",
      category: "metadata",
      detail: "Analysis is limited without a recruiter email.",
      score: 0,
    });
  }

  if (input.jobUrl) {
    const host = hostname(input.jobUrl);
    if (!host) {
      signals.push({
        label: "Job URL is malformed",
        severity: "medium",
        category: "metadata",
        detail: `Could not parse the URL "${input.jobUrl}".`,
        score: 8,
      });
    } else {
      if (URL_SHORTENERS.has(host)) {
        signals.push({
          label: "Shortened job URL",
          severity: "high",
          category: "domain",
          detail: `${host} is a URL shortener — hides the real destination.`,
          score: 18,
        });
      }
      if (SUSPICIOUS_TLDS.has(tld(host))) {
        signals.push({
          label: "Unusual posting domain TLD",
          severity: "medium",
          category: "domain",
          detail: `${host} uses an uncommon TLD.`,
          score: 8,
        });
      }
      // IP-as-host
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        signals.push({
          label: "Raw IP address as host",
          severity: "high",
          category: "domain",
          detail: `${host} is a raw IP — legitimate employers do not post jobs from one.`,
          score: 20,
        });
      }
      if (host.split(".").length > 4) {
        signals.push({
          label: "Deeply nested subdomain",
          severity: "low",
          category: "domain",
          detail: `${host} uses an unusual number of subdomains.`,
          score: 4,
        });
      }
    }
  }

  return signals;
}
