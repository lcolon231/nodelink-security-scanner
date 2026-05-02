# NodeLink SMB Security Posture Scanner

A lightweight external security assessment tool built for small-business prospects. Enter a domain, get a risk score, severity-ranked findings with remediation guidance, and a downloadable branded PDF report.

Built as a flagship project for NodeLink Technologies LLC. Production-ready Next.js, TypeScript, and pdf-lib.

> **Demo flow:** prospect enters their domain, waits 15-30 seconds, gets a 0-100 score with a list of fixable issues. The branded PDF gives MSPs a concrete artifact to discuss. Prospects who score below 75 are warm leads.

## Features

- 9 passive external checks: SPF, DKIM, DMARC, MX, DNS hygiene (NS, CAA), TLS certificate health and protocol, HTTP security headers, HTTPS redirect, exposed common ports.
- Deterministic 0-100 risk score with explainable severity-based deductions.
- Plain-English remediation written for non-technical owners, not security engineers.
- Branded PDF report with logo, score card, executive summary, and per-finding fix boxes.
- Scan history dashboard.
- Per-IP rate limiting.
- SQLite for development, swap to PostgreSQL by changing one env var.

## Safety boundary

This tool performs **only passive or low-impact checks** against public infrastructure: read-only DNS lookups, TLS handshake inspection, TCP-connect probes on common ports, and HTTP fetches to read response headers. It does not exploit vulnerabilities, attempt authentication, fuzz inputs, perform SYN scans, or stress-test targets.

Use this tool only against domains you are authorized to assess (your own domain or a prospect who has consented to a self-assessment).

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma 5 + SQLite (dev) / PostgreSQL (prod)
- pdf-lib for PDF generation (no Chromium dependency)
- Zod for input validation
- LRU cache for in-memory rate limiting

## Quick start

Requires Node.js 18.17+ (20+ recommended).

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env

# 3. Database
npx prisma generate
npx prisma db push

# 4. Run
npm run dev
```

Open http://localhost:3000 and scan a domain you control or have permission to assess.

> **Windows note:** if `npx prisma db push` fails with EPERM (file in use), stop the dev server first, run the command, then restart `npm run dev`.

> **Prisma version:** the project pins Prisma 5.x. Prisma 7 changed the schema syntax; do not upgrade without updating `schema.prisma` accordingly.

## Project structure
prototype/
prisma/            # Prisma schema + dev.db SQLite file
public/            # nodelink-logo.jpg embedded into PDF
samples/           # Example scan output JSON
src/
app/             # Next.js routes (pages + API)
api/scan/      # POST /api/scan, GET /api/scan/[id], GET /api/scan/[id]/pdf
scan/[id]/     # Results page
scans/         # History dashboard
components/      # ScanForm, ScoreGauge, FindingCard, SeverityBadge
lib/             # db, validation, rate limit, logger
pdf/             # report.ts (pdf-lib generator)
scanner/         # orchestrator + 9 check modules + scoring
## Scoring model

Start at 100. Each failed check deducts based on severity. Floor at 0. Passing and informational findings deduct nothing.

| Severity | Deduction |
|----------|-----------|
| Critical | 25        |
| High     | 15        |
| Medium   | 8         |
| Low      | 3         |
| Info     | 0         |

Severity is intrinsic to each check, not derived from context. This keeps scoring deterministic and explainable.

| Score | Band       |
|-------|------------|
| 90-100 | Strong     |
| 75-89  | Good       |
| 60-74  | Needs Work |
| 40-59  | Weak       |
| 0-39   | Critical   |

## Sample scan output

See `samples/scan-output.json` for an example of the JSON returned by `GET /api/scan/[id]`.

## Security recommendations

If you deploy this beyond a personal demo:

1. **Authentication.** The MVP has no login. For multi-tenant or paid use, add NextAuth or Clerk and scope scans to the user.
2. **Stronger rate limiting.** Replace the in-memory LRU with Upstash Redis or Vercel KV so limits survive restarts and work across serverless instances. Limit by both IP and account.
3. **Domain ownership verification before reports are emailed.** A user can scan any domain right now. For automated email delivery, require the user to publish a TXT verification record before generating a branded PDF that names them as the requester.
4. **Background jobs.** Synchronous scans block the request for 15-30 seconds. For better UX and timeout safety on serverless, move scans to a queue (Inngest, BullMQ, or Vercel Cron + a polled status endpoint).
5. **Outbound network egress.** When deployed, ensure your hosting provider allows outbound TCP to common ports (22, 25, 3389, etc.). Some hosts block these.
6. **Audit logging.** Record who scanned what and when. The current schema captures the domain and timestamp; expand to include IP, user-agent, and (when added) authenticated user ID.
7. **Abuse prevention.** Block scans against well-known sensitive domains (government, banking, healthcare you don't have permission for). Maintain a deny-list.
8. **Disclaimer.** The PDF footer and on-screen UI both clearly state this is a lightweight external assessment, not a penetration test. Keep that language.

## Roadmap

### MVP (this codebase)

- [x] Domain input + validation
- [x] 9 passive external checks
- [x] Risk scoring with explainable severity
- [x] Results page with score gauge and findings
- [x] Branded PDF report
- [x] Scan history dashboard
- [x] Per-IP rate limiting

### v1 (next)

- [ ] User accounts (NextAuth)
- [ ] Postgres in production (one env var change)
- [ ] Async scans with status polling
- [ ] Email delivery of PDF reports (with domain ownership verification)
- [ ] Scheduled re-scans (weekly/monthly per domain)
- [ ] Diff between scans ("3 new issues since last week")
- [ ] Logo upload per workspace (white-label for MSP partners)
- [ ] Export to CSV / JSON

### Premium / future

- [ ] Subdomain enumeration (passive sources only: certificate transparency, DNS)
- [ ] Cloud-misconfig hints from public metadata (S3/Azure blob naming patterns, exposed buckets)
- [ ] Mailbox-level DKIM/DMARC alignment analysis (with consented inbox access)
- [ ] HIPAA / SOC 2 control mapping in the PDF
- [ ] Slack/Teams alerts when a tracked domain's score drops
- [ ] API access for MSP integrations (PSA tools, RMM dashboards)
- [ ] Vendor risk module (assess your suppliers' domains in bulk)

## License

Proprietary - NodeLink Technologies LLC. All rights reserved.

## Disclaimer

This tool provides a lightweight external assessment based on passive checks of public domain infrastructure. It is not a penetration test, not a comprehensive security audit, and does not guarantee the absence of vulnerabilities. Findings are advisory. Use against domains you own or have explicit authorization to assess.
