# Threatory

Threatory is a deterministic web security and privacy analysis platform that provides transparent, evidence-backed security assessments in one unified application. Built for everyday web users, students, learners, and website operators, Threatory replaces opaque "safe/unsafe" verdicts and confusing technical dumps with explainable findings, clear severity ratings, actionable recommendations, and explicit assessment limitations.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Features](#2-features)
- [3. Technology Stack](#3-technology-stack)
- [4. Prerequisites](#4-prerequisites)
- [5. Repository Structure](#5-repository-structure)
- [6. Installation](#6-installation)
- [7. Local MongoDB Setup](#7-local-mongodb-setup)
- [8. Environment Configuration](#8-environment-configuration)
- [9. Running Locally](#9-running-locally)
- [10. API Routes](#10-api-routes)
- [11. Analyzer Limitations & Safety Invariants](#11-analyzer-limitations--safety-invariants)
- [12. Report Ownership and Retention](#12-report-ownership-and-retention)
- [13. Deployment Architecture](#13-deployment-architecture)
- [14. Troubleshooting](#14-troubleshooting)

---

## 1. Project Overview

Digital risk for everyday people generally falls into three categories:
1. **Phishing Links:** Misleading or lookalike links designed to deceive users.
2. **Personal Data Exposure:** Handles, contact details, or credentials inadvertently published online.
3. **Insecure Website Configuration:** Missing HTTPS, vulnerable headers, insecure cookies, or missing email authentication DNS records on personal or business sites.

Threatory provides three deterministic, rule-based analyzers in one place. Every scan produces a structured report containing:
- Specific findings with stable uppercase codes (e.g. `URL_IP_HOST`, `PRIV_EMAIL_FOUND`, `SITE_HSTS`).
- Concrete, human-readable evidence.
- Explanations of why the finding matters.
- Actionable recommendations for remediation.
- Explicit disclosures of what was not checked.
- Anonymous browser-based ownership and automated retention.

---

## 2. Features

- **URL Analyzer (`/url-analyzer`):** Evaluates URL strings as data to detect phishing signals (IP literals, lookalike typosquatting against the Tranco Top 10k domains, homoglyphs, brand spoofing subdomains, URL shorteners, open redirect parameters, and local threat feed matching). Computes a rule-based assessment score (0–100) and risk level. Never visits or fetches the target URL.
- **Privacy Exposure Analyzer (`/privacy-analyzer`):** Reviews user-submitted profile handles and sample text (with mandatory consent) to detect username reuse, email exposure, phone number exposure, credential leaks (AWS keys, GitHub tokens, Slack tokens, Google API keys, private keys, JWTs), and payment card numbers via the Luhn algorithm. Automatically masks all sensitive evidence and enforces a strict zero-raw-storage guarantee.
- **Website Security Auditor (`/website-auditor`):** Non-invasively audits public configuration of authorized websites across 4 categories: Connection & TLS, HTTP security headers, Cookie attributes, and DNS/email security (SPF, DMARC, CAA). Protected by an RFC-compliant SSRF guard with pinned DNS lookups and 3-hop redirect limits.
- **Platform Dashboard (`/`):** Real-time aggregation of total scans, per-module metrics, risk distribution donut chart, scans-by-module bar chart, and recent scan list using MongoDB `$facet` aggregation.
- **Scan History (`/history`):** URL-synchronized filtering by module and status, date range filtering, and clean pagination. Renders all user targets as strict plain text (no clickable external links).
- **Report Actions:** Reopen saved reports via anonymous session cookies, copy sanitized reports as Markdown or JSON, emulate clean print stylesheets (`@media print` hiding chrome and navigation), and delete reports permanently.
- **Help Center (`/help`):** Plain-language documentation covering methodology, analyzer scopes, storage rules, and retention timelines.

---

## 3. Technology Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) 15 (App Router, Server Components & Client Boundaries)
- **UI & Components:** React 19, [Tailwind CSS](https://tailwindcss.com/) v3, [shadcn/ui](https://ui.shadcn.com/) primitives, [Lucide React](https://lucide.dev/) icons
- **State & Data Fetching:** [TanStack Query](https://tanstack.com/query) v5
- **Form Management & Validation:** React Hook Form, Zod v3 resolver (`@hookform/resolvers`)
- **Data Visualization:** [Recharts](https://recharts.org/) (accompanied by accessible screen-reader tables)

### Backend
- **Runtime & Framework:** Node.js 22 LTS, [Express](https://expressjs.com/) 4 (strict TypeScript)
- **Database & ODM:** MongoDB 7.0, [Mongoose](https://mongoosejs.com/) 8
- **Validation & Schemas:** Zod v3
- **Security & Middleware:** Helmet, CORS, Express Rate Limit, Cookie Parser (signed cookies), Pino & Pino-HTTP logging with extensive field redaction
- **Domain & Analysis Engines:** `tldts`, `fastest-levenshtein`, `validator`, `libphonenumber-js`, `ipaddr.js`, `undici`, `p-limit`, `set-cookie-parser`, `node-cron`

### Shared Contracts (`@threatory/contracts`)
- Monorepo package sharing Zod schemas, TypeScript types, validation envelopes, and test fixtures between frontend and backend.

### Testing & Tooling
- **Unit & Integration:** [Vitest](https://vitest.dev/), Supertest, React Testing Library, `mongodb-memory-server`
- **Accessibility:** `vitest-axe` (automated WCAG 2.1 AA audits)
- **End-to-End:** [Playwright](https://playwright.dev/) (27 browser journeys covering all features and isolation)
- **Quality & Security:** ESLint 9 (flat config with `typescript-eslint`), Prettier, Gitleaks 8

---

## 4. Prerequisites

- **Node.js:** Node.js 22 LTS (version `v22.23.4` verified; see `.nvmrc`)
- **npm:** npm >= 10 (`10.9.9` verified)
- **Git:** Version control
- **Docker & Docker Compose:** Optional for local MongoDB service (or local `mongod` binary)

---

## 5. Repository Structure

```
threatory/
├── packages/contracts/          # Shared contracts, Zod schemas, fixtures, golden-inputs.json
│   ├── src/                     # Contract definitions (Report, Finding, ApiError, etc.)
│   └── fixtures/                # Verified report contract fixtures
├── backend/                     # Express 4 TypeScript API service
│   ├── src/
│   │   ├── config/              # Environment schema, Mongoose connection
│   │   ├── middleware/          # Helmet, CORS, Rate Limit, Owner Cookie, Pino Logger, Errors
│   │   ├── models/              # Mongoose Scan and Feed models with TTL indexes
│   │   ├── modules/
│   │   │   ├── url/             # URL normaliser, 16 rules, evaluation engine
│   │   │   ├── privacy/         # Privacy masking, 9 exposure rules, consent guard
│   │   │   ├── website/         # SSRF guard, TLS/header/cookie/DNS checkers
│   │   │   └── feeds/           # Phishing & malware feed synchronizer
│   │   ├── repositories/        # Scan database queries & atomic $facet dashboard summary
│   │   ├── routes/              # Health, Scans, and Dashboard endpoints
│   │   └── server.ts            # Server entrypoint with graceful shutdown
│   ├── data/                    # Tranco Top 10k domains, URL shorteners list
│   ├── tests/                   # 23 Vitest suites (259 tests)
│   └── Dockerfile               # Production multi-stage Docker build
├── frontend/                    # Next.js 15 App Router web application
│   ├── src/
│   │   ├── app/                 # Next.js routes (/, /url-analyzer, /privacy-analyzer, etc.)
│   │   ├── components/          # AppShell, report components, UI primitives
│   │   ├── features/            # URL, Privacy, Website, History, Dashboard feature modules
│   │   └── lib/                 # Typed API client, utility functions
│   └── tests/                   # 18 Vitest suites (112 tests, 0 axe violations)
├── e2e/                         # Playwright E2E browser tests (27 journeys)
├── docs/                        # Architecture, Security, Demo Script, Handoff documentation
├── docker-compose.yml           # Local MongoDB container definition
├── render.yaml                  # Render Infrastructure-as-Code Blueprint
└── package.json                 # Monorepo workspaces manifest
```

---

## 6. Installation

Clone the repository and install all workspace dependencies:

```bash
git clone https://github.com/upendra-devhub/Threatory.git
cd Threatory
npm ci
```

The root `postinstall` script automatically compiles `@threatory/contracts` into `packages/contracts/dist` so all workspaces have immediate access to shared TypeScript definitions.

---

## 7. Local MongoDB Setup

Threatory requires MongoDB for report storage and aggregation.

### Option A: Using Docker Compose (Recommended)
```bash
docker compose up -d
```
Starts a MongoDB 7.0 container on `127.0.0.1:27017` with a persistent volume `mongodb_data`.

To stop the database:
```bash
docker compose down
```

### Option B: Local MongoDB Binary
Ensure `mongod` is listening on `127.0.0.1:27017`.

---

## 8. Environment Configuration

Threatory separates configuration cleanly between backend and frontend.

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:

```ini
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/threatory
FRONTEND_ORIGIN=http://localhost:3000
COOKIE_SECRET=replace_with_a_secure_cookie_secret_at_least_32_chars
FEEDS_SYNC_ENABLED=false
TRUST_PROXY=false

# Development only (STRICTLY PROHIBITED in production):
DEV_OWNER_ID=dev-owner-local-test
```

### Frontend (`frontend/.env.local`)
Copy `frontend/.env.example` to `frontend/.env.local`:

```ini
# Server-side API origin used by Next.js rewrites (/api/:path* -> API_ORIGIN/api/:path*)
API_ORIGIN=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Security Invariant:** `.env` and `.env.*` files are strictly excluded from version control in `.gitignore`. Production secrets are configured through hosting-provider secret dashboards.

---

## 9. Running Locally

### Start Backend Service (Port 4000)
```bash
npm start -w backend
```

### Start Frontend Application (Port 3000)
```bash
npm run dev -w frontend
```
Open `http://localhost:3000` in your web browser.

### Verification & Testing Commands
```bash
# Full verification (contracts build, lint, typecheck, unit tests, and production build)
npm run verify

# End-to-end Playwright tests (launches isolated backend + frontend on ports 4001 & 3000)
npm run e2e

# Run linter across all workspaces
npm run lint

# Run typecheck across all workspaces
npm run typecheck

# Run unit & accessibility tests
npm test

# Seed development database with fixture reports
npm run seed -w backend

# Manual threat feed sync
npm run feeds:sync -w backend
```

---

## 10. API Routes

All endpoints return uniform JSON envelopes:
- **Success:** `{ success: true, data: T }`
- **Error:** `{ success: false, error: { code: string, message: string, fields?: Array<{ path, message }> } }`

| Endpoint | Method | Purpose | Request Body / Query |
|---|---|---|---|
| `/api/health` | `GET` | Service health status | None. Returns `{ status: "ok", timestamp }` |
| `/api/scans/url` | `POST` | Inspect URL structure as data | `{ url: string }` (1–2048 chars) |
| `/api/scans/privacy` | `POST` | Analyze personal info exposure | `{ profiles: Array<{ platform, username, url? }>, displayName?, submittedText?, consent: true }` |
| `/api/scans/website` | `POST` | Audit public security configuration | `{ url: string, authorised: true }` |
| `/api/scans` | `GET` | List owner's report history | Query: `module`, `status`, `from`, `to`, `page`, `limit` (max 50) |
| `/api/scans/:scanId` | `GET` | Retrieve saved report | Path: `scanId` (UUID) |
| `/api/scans/:scanId` | `DELETE` | Delete saved report | Path: `scanId` (UUID) |
| `/api/dashboard/summary` | `GET` | Summary statistics and charts | None. Returns atomic `$facet` aggregation |

---

## 11. Analyzer Limitations & Safety Invariants

1. **URL Analyzer:**
   - Evaluates links purely as data strings.
   - Makes **zero network requests**: no DNS lookups, no HTTP fetches, and no connection attempts to the submitted link.
   - Scores (0 to 100) are rule-based assessment sums, not probabilities.
   - Submitted URLs are never rendered as clickable external links.
2. **Privacy Exposure Analyzer:**
   - Processes only explicitly supplied text and profiles.
   - Requires explicit consent (`consent: true`).
   - Never crawls, visits profile pages, or searches the internet.
   - Strict zero-raw-storage: `submittedText`, unmasked emails, phone numbers, tokens, and credit cards are never stored, logged, or returned.
3. **Website Security Auditor:**
   - Requires explicit owner authorization (`authorised: true`).
   - Protected by RFC-compliant SSRF guard: private IPs, loopbacks, link-local metadata (169.254.169.254), and nonstandard ports are rejected with HTTP 422 `TARGET_BLOCKED`.
   - Never exploits, brute-forces, or sends attack payloads.
   - Never stores HTTP response bodies or cookie values.
   - Incomplete checks are marked `not_assessed`, never `pass`.

---

## 12. Report Ownership and Retention

- **Anonymous Browser Ownership:** Threatory uses an anonymous, cryptographically signed `HttpOnly`, `SameSite=Lax` session cookie named `tid`. No account registration, passwords, or emails are required.
- **Owner Scoping:** All report retrieval, history listing, dashboard aggregations, and deletions are strictly filtered by the requesting browser's `ownerId`. Cross-owner access returns `NOT_FOUND` (404).
- **Automated Retention (MongoDB TTL):**
  - **Privacy reports:** Expire after **7 days** (`expiresAt = createdAt + 7d`).
  - **URL reports:** Expire after **30 days** (`expiresAt = createdAt + 30d`).
  - **Website audit reports:** Expire after **30 days** (`expiresAt = createdAt + 30d`).
- **Immediate Deletion:** Users can permanently delete any report at any time using the *Delete report* toolbar action.

---

## 13. Deployment Architecture

```
[ Browser ] 
     │  HTTPS (First-party cookies, relative /api requests)
     ▼
[ Next.js Frontend (Vercel / Netlify) ]
     │  Server-side rewrite (/api/:path* -> API_ORIGIN/api/:path*)
     ▼
[ Express Backend (Render / Docker Host) ]  <── Non-root user, Port 4000/10000
     │  TLS (Mongoose)
     ▼
[ MongoDB Atlas (Free M0 Cluster) ]  <── TTL Indexes, Encrypted at Rest
```

- **Backend Multi-stage Dockerfile:** `backend/Dockerfile` builds from the monorepo root, compiling `@threatory/contracts` and `backend`, prunes devDependencies, runs under user `node`, and includes a native Node.js health check on `/api/health`.
- **Infrastructure Blueprint:** `render.yaml` enables one-click Render Docker web service deployment.
- **Frontend Vercel Config:** `frontend/vercel.json` configures Next.js App Router compilation with server-side `API_ORIGIN` proxying.

---

## 14. Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| `Failed to connect to MongoDB` | MongoDB service is not running or URI is invalid | Run `docker compose up -d` or verify `MONGODB_URI` in `backend/.env`. |
| `DEV_OWNER_ID must not be set in production` | Production environment validation failed | Remove `DEV_OWNER_ID` from production environment variables. |
| `CORS error on API requests` | `FRONTEND_ORIGIN` does not match the actual frontend URL | Set `FRONTEND_ORIGIN` in backend environment to exact frontend origin (e.g. `https://threatory.vercel.app`). |
| `429 RATE_LIMITED` | Scan request threshold exceeded | Wait 60 seconds before initiating subsequent scans, or set `DISABLE_RATE_LIMIT=true` in testing environments. |
| `Request payload exceeds 20 kb limit` | Submitted payload exceeds body parser cap | Ensure submitted text does not exceed 10,000 characters and profiles array has <= 10 items. |
| `Report not found (404)` | Cookie cleared or report expired | Reports belong to the browser session that created them. If cookies are cleared, previous reports are no longer accessible. |

---

## License

ISC License. Built for defensive security analysis, personal privacy auditing, and educational evaluation.
