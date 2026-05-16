export interface ExamplePosting {
  id: string;
  label: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  expectedRisk: "low" | "medium" | "high" | "critical";
  description: string;
}

export const EXAMPLES: ExamplePosting[] = [
  {
    id: "remote-data-entry",
    label: "Classic remote data-entry scam",
    jobTitle: "Remote Data Entry Specialist",
    company: "Global Logistics Partners",
    jobDescription:
      "URGENT HIRING!!! Earn $4,500 per week working from home!! NO EXPERIENCE NECESSARY. We are hiring 50 remote data entry agents IMMEDIATELY. No interview required - direct hire. Send your resume and personal details to our HR Manager on WhatsApp at +1-555-0100 to receive your starter equipment package (small processing fee applies). Limited spots - apply now before they're gone!",
    expectedRisk: "critical",
    description:
      "Hits the canonical signal stack: urgency, off-platform contact, upfront fee, and inflated guaranteed pay.",
  },
  {
    id: "crypto-recruiter",
    label: "Crypto-themed phishing recruiter",
    jobTitle: "Blockchain Operations Assistant",
    company: "ChainBridge Capital",
    jobDescription:
      "We are hiring blockchain operations assistants to help process USDT payouts on behalf of our clients. Payment in crypto. You will need your own web3 wallet. Please DM me your bank information, SSN, and a scan of your ID on Telegram (@chainbridge_hr) to begin onboarding. We pay in BTC weekly. Quick easy money for the right candidate.",
    expectedRisk: "critical",
    description:
      "Asks for sensitive identity data over an encrypted messenger and pays in crypto — textbook money-mule recruitment.",
  },
  {
    id: "ghost-evergreen",
    label: "Evergreen ghost listing",
    jobTitle: "Software Engineer (Generalist)",
    company: "Stealth Mode Startup",
    jobDescription:
      "We are always hiring talented software engineers. This is an evergreen posting for our talent pool — apply now to be considered for future opportunities as they arise. We are a stealth startup working on big ideas. Salary commensurate with experience.",
    expectedRisk: "high",
    description:
      "Vague evergreen 'talent pool' language, no compensation range, no specific role — classic ghost posting.",
  },
  {
    id: "mystery-shopper",
    label: "Mystery shopper template",
    jobTitle: "Mystery Shopper / Secret Buyer",
    company: "ConsumerCheck LLC",
    jobDescription:
      "Become a mystery shopper! Earn $300 per assignment. We will mail you a cashier's check; deposit it, keep your fee, and wire the remainder back to evaluate the wire transfer service. Reply with your full name, address, and phone number to start today.",
    expectedRisk: "critical",
    description:
      "Fake-check / wire-fraud template that has been recycled for over a decade.",
  },
  {
    id: "legit-senior-engineer",
    label: "Legitimate senior engineer role",
    jobTitle: "Senior Backend Engineer",
    company: "Mapbox",
    jobDescription:
      "We're hiring a Senior Backend Engineer to work on our Maps API platform team. You'll own services that serve billions of map tile requests per day. Responsibilities: design and operate distributed systems in Go and Rust; collaborate with product and SRE; mentor mid-level engineers. Requirements: 6+ years of backend experience, deep knowledge of distributed systems, comfort operating production services. Salary range: $185,000–$230,000 base + equity + benefits (health, dental, vision, 401k match, 4 weeks PTO). Interview process: recruiter screen, hiring manager call, technical deep-dive, system design, team match. We are an equal opportunity employer.",
    expectedRisk: "low",
    description:
      "Specific scope, salary range disclosed, structured benefits, and a documented interview process.",
  },
  {
    id: "borderline-recruiter",
    label: "Borderline — free webmail recruiter",
    jobTitle: "Marketing Coordinator",
    company: "Brightline Studios",
    jobDescription:
      "Brightline Studios is looking for a marketing coordinator to help run our weekly newsletter and social channels. You'll work cross-functionally with design and editorial. We move fast and want someone who can ship work quickly. Apply now — we're looking to close this role this week. Reply to brightline.studios@gmail.com to get started.",
    expectedRisk: "medium",
    description:
      "Not a scam, but the gmail.com recruiter address and pressure to apply 'this week' merit caution.",
  },
];
