/**
 * Seed the database with realistic demo analyses so the /community page
 * has interesting content right after `docker compose up`.
 *
 * Idempotent: re-running it is a no-op if a seed marker row already exists.
 * Set FORCE_RESEED=1 to wipe and reinsert.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import { analysesTable, type StoredSignal } from "@workspace/db/schema";

const SEED_MARKER_COMPANY = "__hireshield_seed_marker__";

interface SeedAnalysis {
  jobTitle: string;
  company: string;
  recruiterEmail: string | null;
  jobUrl: string | null;
  jobDescription: string;
  trustScore: number;
  fraudRisk: "low" | "medium" | "high" | "critical";
  ghostJobProbability: number;
  confidenceLevel: number;
  signals: StoredSignal[];
  candidateSummary: string;
  recommendedActions: string[];
  daysAgo: number;
}

const sig = (
  category: StoredSignal["category"],
  severity: StoredSignal["severity"],
  label: string,
  detail: string,
  score?: number,
): StoredSignal => ({ category, severity, label, detail, score: score ?? null });

const SEEDS: SeedAnalysis[] = [
  // ───────── LOW RISK (legit-looking) ─────────
  {
    jobTitle: "Senior Backend Engineer (Go)",
    company: "Northwind Cloud",
    recruiterEmail: "hiring@northwind.cloud",
    jobUrl: "https://careers.northwind.cloud/jobs/be-senior-go",
    jobDescription:
      "We're hiring a Senior Backend Engineer to extend our distributed " +
      "object-storage platform. You'll work on the metadata service (Go, " +
      "Postgres, gRPC), participate in on-call rotations, and own the " +
      "performance roadmap. Compensation: $180k–$220k base + equity. " +
      "Remote within EU/US time zones. Comprehensive benefits. We do " +
      "two technical interviews and a take-home pairing session.",
    trustScore: 92,
    fraudRisk: "low",
    ghostJobProbability: 6,
    confidenceLevel: 94,
    signals: [
      sig("metadata", "info", "Recruiter domain matches company", "Email domain `northwind.cloud` matches the company website.", 0),
      sig("stylometry", "info", "Specific, concrete language", "Tech stack, comp range, and interview process are all explicit.", 0),
    ],
    candidateSummary:
      "Strong signals across the board: explicit compensation, named tech stack, " +
      "and a recruiter address on the company's own domain. No urgency language, " +
      "no off-channel contact requests. Looks like a normal hiring process.",
    recommendedActions: [
      "Confirm the role is listed on the company's careers page",
      "Search the recruiter's name on LinkedIn for tenure at the company",
    ],
    daysAgo: 1,
  },
  {
    jobTitle: "Staff Product Designer, Platform",
    company: "Helio Labs",
    recruiterEmail: "talent@heliolabs.io",
    jobUrl: "https://heliolabs.io/careers/staff-designer-platform",
    jobDescription:
      "Helio Labs is hiring a Staff Product Designer to lead the design " +
      "system across our developer platform. You'll partner with engineering " +
      "leadership, define multi-quarter design strategy, and mentor a team " +
      "of 4 designers. 7+ years of product design experience, with at least " +
      "2 years in a staff or lead role. SF Bay Area or remote (US). " +
      "Base $210k–$245k.",
    trustScore: 88,
    fraudRisk: "low",
    ghostJobProbability: 14,
    confidenceLevel: 89,
    signals: [
      sig("metadata", "info", "Verified company domain", "Recruiter email matches the listed company URL.", 0),
      sig("stylometry", "info", "Senior-role specifics", "Mentions team size, mentorship scope, and concrete seniority bar.", 0),
    ],
    candidateSummary:
      "Detailed senior-role posting with explicit responsibilities and salary range. " +
      "Slight ghost-job risk because staff-level roles often stay open for months — " +
      "ask about timeline.",
    recommendedActions: [
      "Ask the recruiter when the role opened and how many candidates are in pipeline",
    ],
    daysAgo: 2,
  },
  {
    jobTitle: "Site Reliability Engineer II",
    company: "Cobalt Systems",
    recruiterEmail: "sre-hiring@cobaltsystems.com",
    jobUrl: "https://cobaltsystems.com/jobs/sre-ii",
    jobDescription:
      "Join our SRE team to operate the Cobalt control plane (Kubernetes, " +
      "Terraform, Datadog). You'll own SLOs for a tier-1 service, design " +
      "capacity plans, and contribute to our incident-response runbooks. " +
      "3+ years SRE or production engineering. Remote, US time zones. " +
      "$165k–$195k base + 0.05% equity.",
    trustScore: 90,
    fraudRisk: "low",
    ghostJobProbability: 8,
    confidenceLevel: 92,
    signals: [
      sig("metadata", "info", "Domain alignment", "Recruiter email and posting URL share the same domain.", 0),
      sig("stylometry", "info", "Technical depth", "Mentions specific tools, SLO ownership, and incident runbooks.", 0),
    ],
    candidateSummary:
      "Clean posting with concrete technical scope and compensation. No friction.",
    recommendedActions: [
      "Verify the company on LinkedIn before scheduling interviews",
    ],
    daysAgo: 3,
  },
  {
    jobTitle: "Engineering Manager, Payments",
    company: "Lattice Pay",
    recruiterEmail: "kira.shah@latticepay.co",
    jobUrl: "https://latticepay.co/careers/em-payments",
    jobDescription:
      "Lead our Payments engineering team (8 engineers) building card and " +
      "ACH rails. Ownership of roadmap, headcount, and partner integrations " +
      "(Stripe, Adyen). 5+ years engineering, 2+ years management. London " +
      "or remote (UK/EU). £140k–£170k base + equity.",
    trustScore: 87,
    fraudRisk: "low",
    ghostJobProbability: 12,
    confidenceLevel: 88,
    signals: [
      sig("metadata", "info", "Named recruiter on company domain", "Personal email on the company domain rather than a generic alias.", 0),
    ],
    candidateSummary:
      "Manager role with explicit team size, scope, and comp band. Reasonable.",
    recommendedActions: [
      "Confirm Kira Shah's tenure at Lattice Pay on LinkedIn",
    ],
    daysAgo: 4,
  },
  {
    jobTitle: "Junior Data Analyst",
    company: "Meridian Health Research",
    recruiterEmail: "careers@meridianhealth.org",
    jobUrl: "https://meridianhealth.org/jobs/jr-analyst",
    jobDescription:
      "Entry-level analyst role supporting clinical-trial reporting. SQL, " +
      "Python (pandas), and basic statistics. Bachelor's degree or equivalent " +
      "experience. Hybrid (Boston, 3 days on-site). $72k–$84k.",
    trustScore: 85,
    fraudRisk: "low",
    ghostJobProbability: 10,
    confidenceLevel: 86,
    signals: [
      sig("metadata", "info", "Non-profit `.org` domain matches", "Email and posting both on the meridianhealth.org domain.", 0),
    ],
    candidateSummary:
      "Standard entry-level posting with concrete skills and salary. Hybrid setup is clearly stated.",
    recommendedActions: [
      "Search the company's IRB filings to confirm it's a real research organization",
    ],
    daysAgo: 5,
  },

  // ───────── MEDIUM RISK (some concerns) ─────────
  {
    jobTitle: "Full-Stack Developer (React + Node)",
    company: "Brightwave Studio",
    recruiterEmail: "brightwave.hr@gmail.com",
    jobUrl: "https://brightwavestudio.work",
    jobDescription:
      "Looking for a passionate full-stack developer to join our growing " +
      "team. You'll work on exciting projects using modern technologies. " +
      "Competitive salary. Remote-friendly. Apply quickly — we're moving " +
      "fast on this hire.",
    trustScore: 58,
    fraudRisk: "medium",
    ghostJobProbability: 42,
    confidenceLevel: 71,
    signals: [
      sig("metadata", "medium", "Free webmail address", "Recruiter contact uses a `gmail.com` address rather than the company domain.", 12),
      sig("stylometry", "low", "Vague role description", "No specific tech stack, no compensation range, no team size.", 6),
      sig("urgency", "low", "Mild urgency language", "Phrase \"moving fast on this hire\" detected.", 4),
    ],
    candidateSummary:
      "The posting is technically real but light on specifics. The Gmail address is " +
      "the biggest yellow flag — established companies almost always use their own " +
      "domain for recruiter contact.",
    recommendedActions: [
      "Ask the recruiter to send the next message from a company-domain email",
      "Request the specific tech stack and salary range in writing",
    ],
    daysAgo: 1,
  },
  {
    jobTitle: "Marketing Coordinator",
    company: "Apex Growth Partners",
    recruiterEmail: "hr@apex-growth-partners.com",
    jobUrl: "https://apex-growth-partners.com/careers",
    jobDescription:
      "Apex Growth Partners is hiring a Marketing Coordinator to support " +
      "campaign execution across email, social, and paid channels. 1-3 " +
      "years experience. Remote. Salary negotiable based on experience.",
    trustScore: 64,
    fraudRisk: "medium",
    ghostJobProbability: 55,
    confidenceLevel: 73,
    signals: [
      sig("stylometry", "low", "Generic responsibilities", "Description could apply to nearly any marketing coordinator role.", 5),
      sig("duplicate", "medium", "Near-duplicate of prior postings", "82% text similarity to two postings analyzed in the last 30 days.", 10),
    ],
    candidateSummary:
      "Posting is plausible but reads like a template. High ghost-job probability " +
      "based on similarity to repeated listings — this exact text has surfaced before.",
    recommendedActions: [
      "Ask when the role opened and whether anyone has been interviewed",
    ],
    daysAgo: 2,
  },
  {
    jobTitle: "Sales Development Representative",
    company: "Trailhead Solutions",
    recruiterEmail: "j.miller@trailheadsols.net",
    jobUrl: "https://trailheadsols.net/jobs/sdr-2026",
    jobDescription:
      "Hungry SDR wanted to join our high-energy sales team. Make 100+ " +
      "outbound calls per day. Uncapped commission, top reps earn $150k+. " +
      "No experience needed — we'll train the right person. Start ASAP.",
    trustScore: 52,
    fraudRisk: "medium",
    ghostJobProbability: 18,
    confidenceLevel: 76,
    signals: [
      sig("urgency", "medium", "Multiple urgency markers", "Detected phrases: \"hungry\", \"high-energy\", \"start ASAP\".", 10),
      sig("stylometry", "low", "Income-focused phrasing", "Compensation framed as aspirational (\"top reps earn $150k+\") not as a band.", 5),
      sig("urgency", "low", "\"No experience needed\"", "Common in volume-recruitment roles but also a soft scam indicator.", 4),
    ],
    candidateSummary:
      "SDR roles legitimately use urgent language, but the combination of \"start ASAP\", " +
      "income aspiration framing, and no experience requirement raises the bar. " +
      "Worth scrutinizing the company.",
    recommendedActions: [
      "Check the company's Glassdoor reviews and average SDR tenure",
      "Ask about base salary vs commission split",
    ],
    daysAgo: 3,
  },
  {
    jobTitle: "Remote Software Engineer",
    company: "Visionary Tech Group",
    recruiterEmail: "recruiting@visionary-tg.com",
    jobUrl: "https://visionary-tg.com/job/swe",
    jobDescription:
      "We are seeking talented software engineers to join our dynamic team. " +
      "Work remotely from anywhere. Flexible hours. Multiple positions " +
      "available. Excellent benefits package.",
    trustScore: 55,
    fraudRisk: "medium",
    ghostJobProbability: 71,
    confidenceLevel: 70,
    signals: [
      sig("stylometry", "medium", "Highly generic phrasing", "Description has no specific technologies, products, or team details.", 12),
      sig("duplicate", "medium", "Pattern matches mass-posting", "Phrasing common to listings posted across multiple boards simultaneously.", 8),
    ],
    candidateSummary:
      "Reads like a job-board filler ad. Could be a real company casting a wide " +
      "net, but the very high ghost-job probability suggests the role may not " +
      "actually be open.",
    recommendedActions: [
      "Ask for the specific product you'd work on",
      "Request to speak with the hiring manager, not just the recruiter",
    ],
    daysAgo: 4,
  },
  {
    jobTitle: "Product Manager",
    company: "Stellar Innovations",
    recruiterEmail: "talent@stellar-innovations.io",
    jobUrl: "https://stellar-innovations.io/careers/pm",
    jobDescription:
      "Join our rapidly growing startup as a Product Manager. You'll work " +
      "with cross-functional teams on industry-disrupting products. 3+ years " +
      "PM experience. Equity-heavy compensation. Remote-first culture.",
    trustScore: 67,
    fraudRisk: "medium",
    ghostJobProbability: 38,
    confidenceLevel: 75,
    signals: [
      sig("stylometry", "low", "Buzzword density", "\"Rapidly growing\", \"industry-disrupting\", \"cross-functional\" cluster.", 6),
      sig("metadata", "low", "Vague compensation", "\"Equity-heavy\" with no cash band specified.", 5),
    ],
    candidateSummary:
      "Plausible early-stage posting. Buzzword density is high and comp is vague. " +
      "Not a red flag on its own, but ask hard questions about base salary.",
    recommendedActions: [
      "Request a specific cash salary band before scheduling interviews",
    ],
    daysAgo: 6,
  },

  // ───────── HIGH RISK (multiple red flags) ─────────
  {
    jobTitle: "Personal Assistant — Remote",
    company: "Henderson Family Office",
    recruiterEmail: "mr.henderson.hire@outlook.com",
    jobUrl: null,
    jobDescription:
      "I am a busy executive seeking a reliable personal assistant to help " +
      "with errands, scheduling, and small purchases on my behalf. $35/hour. " +
      "10-15 hours per week. I will send you a check to cover initial supplies " +
      "and your first week. Please reply with your full name, address, and " +
      "bank details so I can set up direct deposit before we begin.",
    trustScore: 12,
    fraudRisk: "critical",
    ghostJobProbability: 5,
    confidenceLevel: 96,
    signals: [
      sig("nlp", "high", "Advance-payment scam pattern", "\"I will send you a check to cover initial supplies\" matches the classic overpayment fraud script.", 35),
      sig("nlp", "high", "Bank-details request", "Requests bank details before any interview or contract.", 28),
      sig("metadata", "high", "Personal Outlook address, no company URL", "No verifiable employer.", 18),
      sig("urgency", "low", "Off-platform contact preferred", "\"Please reply\" with personal data directly to email.", 4),
    ],
    candidateSummary:
      "This posting matches a well-known advance-payment / check-overpayment scam " +
      "pattern. Real employers never request bank details before an offer letter " +
      "and never send checks to cover \"supplies\" before work begins.",
    recommendedActions: [
      "Do not send any personal or banking information",
      "Do not deposit any checks received from this contact",
      "Report the posting to the platform where you found it",
    ],
    daysAgo: 1,
  },
  {
    jobTitle: "Crypto Operations Specialist",
    company: "Nexus Digital Holdings",
    recruiterEmail: "hr@nexus-digital.work",
    jobUrl: "http://nexus-digital.work",
    jobDescription:
      "URGENT HIRE!!! We need crypto operations specialists immediately. " +
      "Process transactions, manage wallets, earn $5000-$8000 per week. " +
      "No experience necessary, full training provided. You must have your " +
      "own laptop and be willing to verify identity via WhatsApp interview. " +
      "Limited spots — first qualified applicants get the role.",
    trustScore: 8,
    fraudRisk: "critical",
    ghostJobProbability: 3,
    confidenceLevel: 97,
    signals: [
      sig("urgency", "high", "Extreme urgency stack", "\"URGENT\", \"immediately\", \"limited spots\" all present.", 25),
      sig("nlp", "high", "Money-mule pattern", "\"Process transactions, manage wallets\" with high pay and no experience matches money-laundering recruitment.", 32),
      sig("nlp", "high", "Off-platform interview channel", "Interview via WhatsApp is a strong scam indicator.", 22),
      sig("domain", "medium", "Suspicious TLD", "`.work` TLD with no corresponding online presence.", 12),
      sig("stylometry", "medium", "All-caps emphasis", "Excessive use of all-caps and exclamation points.", 8),
    ],
    candidateSummary:
      "Multiple severe red flags consistent with money-mule recruitment, in which " +
      "victims unknowingly launder funds. The combination of unrealistic pay, no " +
      "experience required, WhatsApp interview, and crypto operations is " +
      "characteristic of this scheme.",
    recommendedActions: [
      "Do not engage with this posting",
      "Do not move money on behalf of anyone you have not verified in person",
      "Report to local financial-crime authorities if you've already been contacted",
    ],
    daysAgo: 2,
  },
  {
    jobTitle: "Data Entry Clerk — Work From Home",
    company: "Premier Business Services",
    recruiterEmail: "premier.hr.dept@yahoo.com",
    jobUrl: null,
    jobDescription:
      "Earn $1500 per week from home! Simple data entry work, flexible hours. " +
      "No experience needed. We provide everything. Small one-time training " +
      "fee of $99 covers your materials and onboarding. Start earning this week!",
    trustScore: 9,
    fraudRisk: "critical",
    ghostJobProbability: 4,
    confidenceLevel: 97,
    signals: [
      sig("nlp", "high", "Up-front fee request", "Asks for a \"training fee\" before work begins — classic employment-scam pattern.", 38),
      sig("urgency", "medium", "Income-promise language", "\"Earn $1500 per week\" with no experience.", 15),
      sig("metadata", "high", "Free webmail + no company URL", "No verifiable employer.", 18),
    ],
    candidateSummary:
      "Legitimate employers do not charge fees to start working. Any \"training fee\", " +
      "\"equipment deposit\", or \"background-check payment\" requested up front is a " +
      "scam.",
    recommendedActions: [
      "Do not pay any fees to apply for or start a job",
      "Report the posting to the FTC if you're in the US",
    ],
    daysAgo: 3,
  },
  {
    jobTitle: "Frontend Engineer — Immediate Start",
    company: "Quantum Web Solutions",
    recruiterEmail: "careers@quantum-web-solutions-hiring.com",
    jobUrl: "https://quantum-web-solutions-hiring.com",
    jobDescription:
      "We urgently need a frontend engineer to start within 48 hours. React, " +
      "Vue, or Angular experience. Salary $130k-$160k. We will conduct the " +
      "interview entirely over Telegram and onboard you immediately. Please " +
      "respond ASAP with your resume and a copy of a government ID for our " +
      "verification process.",
    trustScore: 18,
    fraudRisk: "high",
    ghostJobProbability: 6,
    confidenceLevel: 91,
    signals: [
      sig("nlp", "high", "Government-ID request before interview", "Real employers verify identity after an offer, not before contact.", 30),
      sig("nlp", "high", "Off-platform interview channel", "Telegram-based interviews are strongly associated with identity-theft schemes.", 22),
      sig("urgency", "high", "48-hour deadline", "Compressed timeline removes the candidate's ability to verify the company.", 16),
      sig("domain", "medium", "Lookalike hiring domain", "Domain appended with \"-hiring\" rather than using the company's primary domain.", 10),
    ],
    candidateSummary:
      "The combination of Telegram interview, government-ID request before any " +
      "real contact, and an artificially short deadline points strongly to an " +
      "identity-harvesting scheme.",
    recommendedActions: [
      "Never share government ID before signing an offer letter",
      "Decline to interview on personal chat platforms",
    ],
    daysAgo: 5,
  },

  // ───────── MIXED ─────────
  {
    jobTitle: "DevOps Engineer",
    company: "Riverstone Logistics",
    recruiterEmail: "hiring@riverstonelogistics.com",
    jobUrl: "https://riverstonelogistics.com/careers/devops",
    jobDescription:
      "DevOps engineer for our logistics platform. AWS, Terraform, Kubernetes. " +
      "5+ years experience. On-call rotation. Hybrid (Atlanta, 2 days on-site). " +
      "Compensation discussed during the screening call.",
    trustScore: 76,
    fraudRisk: "medium",
    ghostJobProbability: 22,
    confidenceLevel: 82,
    signals: [
      sig("metadata", "info", "Domain alignment", "Email matches company URL.", 0),
      sig("stylometry", "low", "Compensation deferred to call", "Comp band not specified in writing.", 4),
    ],
    candidateSummary: "Mostly clean. Push for a written comp band before the screening call.",
    recommendedActions: ["Ask for the salary band in writing before scheduling"],
    daysAgo: 7,
  },
  {
    jobTitle: "Customer Success Manager",
    company: "Beacon CRM",
    recruiterEmail: "talent@beaconcrm.com",
    jobUrl: "https://beaconcrm.com/jobs/csm-mid-market",
    jobDescription:
      "Join our CSM team supporting mid-market accounts. Own renewals, drive " +
      "expansion, partner with product on customer feedback loops. 3+ years " +
      "SaaS CSM experience. Remote (US). $95k OTE (70/30 base/variable).",
    trustScore: 83,
    fraudRisk: "low",
    ghostJobProbability: 16,
    confidenceLevel: 87,
    signals: [
      sig("metadata", "info", "OTE breakdown specified", "Explicit base/variable split.", 0),
    ],
    candidateSummary: "Clean CSM posting with explicit compensation structure.",
    recommendedActions: ["Verify on LinkedIn"],
    daysAgo: 8,
  },
  {
    jobTitle: "Senior Machine Learning Engineer",
    company: "Polaris Vision AI",
    recruiterEmail: "ml-hiring@polarisvision.ai",
    jobUrl: "https://polarisvision.ai/careers/sr-ml-eng",
    jobDescription:
      "Polaris Vision is hiring a Senior ML Engineer for our computer-vision " +
      "platform (medical imaging). PhD or equivalent industry experience in " +
      "CV / deep learning. PyTorch, JAX, model deployment at scale. SF Bay " +
      "Area on-site. $240k–$310k base + equity + signing bonus.",
    trustScore: 91,
    fraudRisk: "low",
    ghostJobProbability: 18,
    confidenceLevel: 92,
    signals: [
      sig("stylometry", "info", "Domain expertise required", "Specific to medical imaging with stated frameworks.", 0),
    ],
    candidateSummary:
      "High-specificity senior posting. Slight ghost-job risk because senior ML " +
      "roles often stay open for many months.",
    recommendedActions: ["Ask about pipeline timing"],
    daysAgo: 10,
  },
  {
    jobTitle: "Office Manager",
    company: "Greenfield Architects",
    recruiterEmail: "office@greenfieldarch.com",
    jobUrl: "https://greenfieldarch.com/jobs",
    jobDescription:
      "Boutique architecture firm seeking an experienced Office Manager. " +
      "Manage vendor relationships, coordinate travel, support 12 architects. " +
      "Full-time on-site (Portland, OR). $58k–$68k + benefits.",
    trustScore: 84,
    fraudRisk: "low",
    ghostJobProbability: 11,
    confidenceLevel: 86,
    signals: [
      sig("metadata", "info", "Domain aligned", "Email and URL match.", 0),
    ],
    candidateSummary: "Specific, local, modest salary band — looks legitimate.",
    recommendedActions: ["Check the company's Google Maps listing to confirm physical office"],
    daysAgo: 12,
  },
  {
    jobTitle: "Recruiter — Tech",
    company: "Cascade Talent Partners",
    recruiterEmail: "michael.lee@cascadetalent.co",
    jobUrl: "https://cascadetalent.co/jobs/recruiter",
    jobDescription:
      "Tech recruiter role at a boutique agency. Manage full-cycle search " +
      "for engineering and product roles. 2+ years agency or in-house " +
      "recruiting. Remote. $75k–$95k base + commission.",
    trustScore: 81,
    fraudRisk: "low",
    ghostJobProbability: 19,
    confidenceLevel: 85,
    signals: [
      sig("metadata", "info", "Named recruiter on company domain", "Personal email on the company domain.", 0),
    ],
    candidateSummary: "Standard agency-recruiter role. Comp clearly stated.",
    recommendedActions: ["Verify Michael Lee on LinkedIn"],
    daysAgo: 14,
  },
];

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const force = process.env["FORCE_RESEED"] === "1";

  const marker = await db
    .select({ id: analysesTable.id })
    .from(analysesTable)
    .where(eq(analysesTable.company, SEED_MARKER_COMPANY))
    .limit(1);

  if (marker.length > 0 && !force) {
    console.log(
      "Seed marker found — skipping. Set FORCE_RESEED=1 to wipe and reinsert.",
    );
    await pool.end();
    return;
  }

  if (force) {
    console.log("FORCE_RESEED=1 — wiping prior seed rows");
    await db
      .delete(analysesTable)
      .where(eq(analysesTable.company, SEED_MARKER_COMPANY));
    for (const seed of SEEDS) {
      await db
        .delete(analysesTable)
        .where(eq(analysesTable.company, seed.company));
    }
  }

  const now = Date.now();
  const rows = SEEDS.map((s) => ({
    jobTitle: s.jobTitle,
    company: s.company,
    recruiterEmail: s.recruiterEmail,
    jobUrl: s.jobUrl,
    jobDescription: s.jobDescription,
    trustScore: s.trustScore,
    fraudRisk: s.fraudRisk,
    ghostJobProbability: s.ghostJobProbability,
    confidenceLevel: s.confidenceLevel,
    signals: s.signals,
    aiExplanation: s.candidateSummary,
    candidateSummary: s.candidateSummary,
    recommendedActions: s.recommendedActions,
    createdAt: new Date(now - s.daysAgo * 24 * 60 * 60 * 1000),
  }));

  await db.insert(analysesTable).values(rows);

  // Marker row, hidden by setting an extreme ghost score so it never surfaces.
  await db.insert(analysesTable).values({
    jobTitle: "seed-marker",
    company: SEED_MARKER_COMPANY,
    jobDescription: "internal",
    trustScore: 0,
    fraudRisk: "low",
    ghostJobProbability: 0,
    confidenceLevel: 0,
    signals: [] satisfies StoredSignal[],
    aiExplanation: "",
    candidateSummary: "",
    recommendedActions: [],
  });

  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(analysesTable);

  console.log(
    `Seeded ${SEEDS.length} demo analyses. Total rows: ${count[0]?.n ?? "?"}`,
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
