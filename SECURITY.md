# Security Policy

## Supported Versions

HireShield is a continuously deployed application. Only the latest `main` branch
receives security fixes.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| older   | :x:                |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security problems.**

If you discover a vulnerability, report it privately via GitHub Security
Advisories:

1. Go to the repository on GitHub.
2. Click **Security** → **Advisories** → **Report a vulnerability**.
3. Fill in the form with a clear description, reproduction steps, and the
   impact you observed.

You can expect:

- An acknowledgement within **72 hours**.
- An initial assessment within **7 days**.
- A fix or mitigation plan communicated before any public disclosure.

## Scope

In scope:

- The HireShield API server (`artifacts/api-server`)
- The HireShield web frontend (`artifacts/hireshield`)
- Shared libraries under `lib/`
- The job-posting URL fetcher (`artifacts/api-server/src/lib/fetch-posting.ts`)
  — SSRF, parser bugs, request smuggling, oversized-response handling

Out of scope:

- Self-hosted forks where users have changed configuration or disabled
  safeguards
- Vulnerabilities in upstream dependencies that already have a CVE (please
  report those upstream)
- Denial of service through unrealistic traffic volumes against a public demo
- Social engineering of maintainers or contributors

## Safe Harbor

We will not take legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and
  service interruption.
- Only interact with accounts and data they own or have explicit permission to
  test.
- Give us a reasonable amount of time to fix the issue before public disclosure.

Thank you for helping keep HireShield and its users safe.
