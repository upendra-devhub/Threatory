# HANDOFF

## Baton
- **Current owner:** `upendra-devhub`
- **Updated:** 2026-11-14
- **Status:** READY FOR RELEASE
- **Last completed checkpoint:** CP-12 (Hardening, deployment and documentation)
- **Current branch:** `main`
- **Working version:** `v1.0.0`
- **Direct push status:** Verified on `main` tracking `origin/main`
- **Release tag status:** Ready for human verification (`cp-12-done` and `v1.0.0` tags to be applied by human reviewer)

## Exact next step
The next phase is **maintenance**.
All 12 development checkpoints (CP-01 through CP-12) have been completed, verified, hardened, tested, and documented.
1. The human developer reviews the pushed changes on `origin/main`.
2. The human developer executes the final verification gate: `npm run verify` and `npm run e2e`.
3. The human developer applies the checkpoint tag `cp-12-done` and the release tag `v1.0.0`.
4. The application transitions into ongoing maintenance and operational monitoring.

---

## Production Deployment & Operational Architecture (CP-12)

### Production Topology
```
[ Client Browser ]
        │  HTTPS (First-party cookies, relative /api paths)
        ▼
[ Next.js Frontend ] (Vercel / Netlify / Cloudflare Pages)
        │  Server-side rewrite (/api/:path* -> API_ORIGIN/api/:path*)
        ▼
[ Express Backend ] (Render / Docker container running as non-root user `node`)
        │  TLS Connection (mongodb+srv://)
        ▼
[ MongoDB Atlas ] (Production M0 cluster with TTL expiration indexes)
```

### Production Environment Variables
| Workspace | Variable | Purpose | Notes |
|---|---|---|---|
| **Backend** | `MONGODB_URI` | Production MongoDB connection string | TLS-enabled (`mongodb+srv://`), least-privilege credentials |
| **Backend** | `PORT` | Listening port for Express service | Configurable (e.g. `10000` on Render, `4000` default) |
| **Backend** | `FRONTEND_ORIGIN` | Exact deployed frontend origin for CORS | E.g. `https://threatory.vercel.app` (wildcards prohibited) |
| **Backend** | `COOKIE_SECRET` | Cryptographic secret for signing `tid` cookie | Minimum 32 random characters |
| **Backend** | `NODE_ENV` | Environment mode | Must be `production` |
| **Backend** | `FEEDS_SYNC_ENABLED` | Scheduled threat feed background sync | Boolean (`true` or `false`) |
| **Backend** | `TRUST_PROXY` | Proxy trust for rate limiter and IP resolution | Set to `"1"` or `"true"` behind reverse proxy |
| **Backend** | `DEV_OWNER_ID` | Development owner ID override | **PROHIBITED IN PRODUCTION** (server terminates if set) |
| **Frontend** | `API_ORIGIN` | Target backend URL for Next.js rewrites | E.g. `https://threatory-backend.onrender.com` |
| **Frontend** | `NEXT_PUBLIC_APP_URL` | Canonical public application URL | E.g. `https://threatory.vercel.app` |

---

## Secret Rotation Procedures

### 1. `COOKIE_SECRET` Rotation
1. Generate a new cryptographically random secret string (>= 32 chars):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update the `COOKIE_SECRET` environment variable in the backend hosting dashboard (e.g. Render Environment Settings).
3. Trigger a redeploy of the backend service.
4. **Impact:** Existing anonymous sessions will fail HMAC validation and will be safely regenerated on the next request. Users will start a clean session with a new `tid` cookie.

### 2. `MONGODB_URI` Credential Rotation
1. In the MongoDB Atlas Console:
   - Navigate to **Security > Database Access**.
   - Edit the dedicated Threatory application user and update/regenerate the password.
2. In the backend hosting dashboard, update `MONGODB_URI` with the new connection string credentials.
3. Trigger a redeploy of the backend service.
4. Verify `/api/health` returns HTTP 200 `{ status: "ok" }`.
5. Revoke or remove any obsolete database credentials in Atlas.

### 3. Cloud Hosting Provider Secrets
1. In the respective hosting provider dashboard (Render, Vercel, Netlify), revoke compromised deployment tokens or deploy hooks.
2. Generate new least-privilege API tokens.
3. Update any automated CI/CD repository secrets.

---

## Security Audit & Abuse Hardening Summary (CP-12)

- **Rate Limiting:** Verified via `backend/tests/security-hardening.test.ts`. General API requests are throttled at 100/15m; scan endpoints are throttled at 20/15m. Rate limit rejections return HTTP 429 `RATE_LIMITED` with the standard `ApiError` envelope, no raw request bodies, and no leaked stack traces.
- **Payload & Body Limits:** Hard 20 KB JSON body-parser limit enforced. Requests exceeding 20 KB are rejected with HTTP 400 `VALIDATION_ERROR` ("Request payload exceeds 20 kb limit"). Malformed JSON is rejected with HTTP 400 `VALIDATION_ERROR` ("Malformed JSON payload"). Subsequent valid requests continue without service degradation.
- **CORS Protection:** Configured in `backend/src/app.ts` using dynamic origin validation against `FRONTEND_ORIGIN`. Unapproved origins receive no `Access-Control-Allow-Origin` header. Credentials (`Access-Control-Allow-Credentials: true`) are enabled strictly for the designated origin and never paired with wildcards. Allowed methods are restricted to `GET, POST, DELETE, OPTIONS`.
- **Production Cookie Attributes:** Verified in production test suites: the anonymous owner cookie `tid` strictly sets `HttpOnly: true`, `Secure: true` (in production), `SameSite: "lax"`, and path `"/"`. `DEV_OWNER_ID` is forbidden in production by Zod schema refinement.
- **Pino Logger Redaction:** Redaction paths configured in `backend/src/middleware/logger.ts` redact `req.headers.cookie`, `authorization`, `set-cookie`, `req.body`, `res.body`, `req.cookies`, `req.signedCookies`, and wildcards for `password`, `token`, `secret`, `submittedText`, `email`, `phone`, `cardNumber`, and `tid`.
- **SSRF Regression Suite:** All 17 unit tests in `backend/tests/website-ssrf.test.ts` pass, verifying rejection of IPv4/IPv6 loopbacks, RFC 1918 private subnets, cloud metadata (169.254.169.254), CGNAT, decimal loopbacks (`2130706433`), nonstandard ports (8443), and DNS rebinding prevention via IP pinning.
- **Dependency Audit (`npm audit --omit=dev`):**
  - High severity PostCSS vulnerability resolved via npm `overrides: { "postcss": "^8.5.33" }`.
  - Zod `<4.6.6` (GHSA-mrhx-c7xc-m3w5): High severity advisory regarding memory exhaustion on unconstrained arrays. Proven **non-exploitable** in Threatory due to hard 20 KB body limits and explicit schema length constraints (`profiles.max(10)`). Upgrading to Zod 4.6.7 is a breaking change incompatible with Zod 3; retained with documented proof.
- **Gitleaks Audit:** Scanned all 96+ commits across Git history using Gitleaks 8.30.1. Zero real secrets, passwords, connection strings, or production `.env` files exist in Git history. Verified synthetic unit test tokens are cataloged in `.gitleaksignore`.

---

## Accessibility & UI Polish Summary (CP-12)

- **Route Inventory Audited:**
  - `/` (Dashboard)
  - `/url-analyzer` (URL Analyzer)
  - `/privacy-analyzer` (Privacy Analyzer)
  - `/website-auditor` (Website Security Auditor)
  - `/history` (Scan History)
  - `/reports/[scanId]` (Saved Report Details)
  - `/help` (How to use Threatory)
  - `/_not-found` (`not-found.tsx`)
  - Error boundaries (`error.tsx`, `global-error.tsx`)
- **Help Center (`/help`):** Implemented with all 8 mandatory sections: What Threatory does, URL Analyzer, Privacy Exposure Analyzer, Website Security Auditor, What information is stored (with database schema comparison table), How long reports are kept (7d privacy, 30d URL/website), Browser ownership (`tid` cookie), and Responsible use.
- **Error Boundaries & 404:** Branded `not-found.tsx` and `error.tsx` implemented with clear titles, friendly copy, retry buttons, and dashboard navigation links. Zero stack traces or internal secrets displayed.
- **Favicon & Metadata:** SVG brand favicon created at `frontend/src/app/icon.svg`. Metadata templates configured with consistent titles, descriptions, OpenGraph attributes, and robot indexing prevention on sensitive report routes.
- **Automated Accessibility (`vitest-axe`):** All 18 frontend test suites (112 tests) pass with **0 axe violations**.
- **Keyboard & Screen-Reader Support:** Focus indicators visible across all interactive components, dialog focus trapping on deletion confirmation modal, semantic headings (h1, h2, h3), and accessible HTML table equivalents for Recharts donut and bar visualizations.

---

## Golden Journey Verification (Clean Browser Profiles)

| ID | Input Target | Expected Assessment | Verified Findings | Outcome |
|---|---|---|---|---|
| **U1** | `http://198.51.100.23/login` | Score: 50, Risk: `medium`, Label: "Medium" | `URL_IP_HOST` (fail), `URL_NO_HTTPS` (warn), `URL_KEYWORDS` (warn) | **PASS** |
| **U2** | `https://example.com/` | Score: 0, Risk: `none_detected`, Label: "No suspicious signals detected" | All applicable checks pass. Never displays "Safe". | **PASS** |
| **P1** | `Jane.Doe` / `jane_doe`, `Reach me at jane.doe@example.com or +1 213 373 4253` | Risk: `medium`, Label: "4 exposure signals found" | `PRIV_USERNAME_REUSE` (warn), `PRIV_EMAIL_FOUND` (masked: `j***@example.com`), `PRIV_PHONE_FOUND` (masked: `+1 *** *** **53`), `PRIV_USERNAME_MATCHES_EMAIL` (warn). | **PASS** |
| **P2** | `alpha_dev` / `zeta42`, `Just a normal sentence.` | Risk: `none_detected`, Label: "No exposure patterns detected" | All checks pass cleanly. Zero exposure signals invented. | **PASS** |
| **W1** | `http://127.0.0.1`, `http://[::1]`, `http://2130706433`, `http://169.254.169.254/latest/meta-data`, `https://example.com:8443` | HTTP 422 `TARGET_BLOCKED` | All 5 SSRF targets rejected before network access. Exact copy: *"This address cannot be audited because it is not a public website"*. | **PASS** |
| **W3** | `https://example.com` (authorised: true) | Status: `completed` or `partial`, Risk: `low` or `medium` | `SITE_TLS_CERT_VALID` (pass), 4 check groups rendered: Connection & TLS, HTTP headers, Cookies, DNS & email. | **PASS** |

---

## How to Run & Verify

### Environment & Prerequisites
- **Node.js:** `v22.23.4` (per `.nvmrc`)
- **npm:** `10.9.9`
- **Workspaces:** `@threatory/contracts`, `backend`, `frontend`, `e2e`

### Commands
```bash
# Clean install
npm ci

# Full verification (contracts build, lint, typecheck, unit tests, Next.js production build)
npm run verify

# End-to-end browser journeys (27 Playwright tests covering all features and golden journeys)
npm run e2e

# Start local MongoDB via Docker
docker compose up -d

# Start backend service (Port 4000)
npm start -w backend

# Start frontend application (Port 3000)
npm run dev -w frontend

# Seed development database with fixture reports
npm run seed -w backend

# Execute threat feed synchronization
npm run feeds:sync -w backend

# Run URL evaluation suite
npm run eval:url -w backend

# Scan repository and Git history for secrets
C:\Users\ASUS\bin\gitleaks.exe git --verbose
```

---

## Complete Checkpoint Log

| CP | Owner | Finished | Tag | Description |
|---|---|---|---|---|
| **CP-01** | Person A | 2026-11-11 | `cp-01-done` | Monorepo workspaces, contracts, fixtures, golden-inputs, Vitest tests, GitHub Actions CI. |
| **CP-02** | Person B | 2026-11-11 | `cp-02-done` | Express API, Mongoose connection, Scan model with TTL/indexes, anonymous owner cookie + `DEV_OWNER_ID`, scan repository & routes, docker-compose.yml. |
| **CP-03** | Person A | 2026-11-11 | `cp-03-done` | Next.js 15 App Router foundation, design tokens, `/api/:path*` rewrite, typed API client, TanStack Query provider, shared report components, `/reports/[scanId]`, `ApiStatusIndicator`. |
| **CP-04** | Person A | 2026-11-12 | `cp-04-done` | URL normaliser (`tldts`), 11 core detection rules (`url-1.0.0`), weighted scoring engine, `POST /api/scans/url` endpoint with 30-day TTL, zero-network tests, golden inputs U1 to U4. |
| **CP-05** | Person A | 2026-11-13 | `cp-05-done` | URL Analyzer screen (`/url-analyzer`), React Hook Form + Zod, `useUrlScan` mutation hook, `URLDetailsCard`, plain-text URL rendering, Playwright E2E infrastructure with in-memory Mongo test server. |
| **CP-06** | Person B | 2026-11-13 | `cp-06-done` | URL advanced detection (`URL_LOOKALIKE`, `URL_HOMOGRAPH`, `URL_BRAND_SUBDOMAIN`, `URL_SHORTENER`, `URL_FEED_MATCH`), Tranco 10k dataset, OpenPhish & URLhaus sync, `node-cron` scheduler, evaluation framework (`url-1.1.0`). |
| **CP-07** | Person A | 2026-11-13 | `cp-07-done` | Privacy Exposure Analyzer engine & endpoint (`POST /api/scans/privacy`), local profile URL parsing, 9 detection rules (`privacy-1.0.0`), sensitive value masking, zero raw storage, 7-day TTL retention, golden inputs P1-P4. |
| **CP-08** | Person A | 2026-11-13 | `cp-08-done` | Privacy Analyzer screen (`/privacy-analyzer`), dynamic profile rows (1–10), visible scope notice, mandatory consent enforcement, zero browser storage leaks, masked report presentation, Playwright E2E journeys. |
| **CP-09** | Sana | 2026-11-13 | `cp-09-done` | Website Auditor engine, SSRF guard (RFC compliance, undici pinned connector, 3-hop redirect guard), 20 detection rules (DNS, TLS, Headers, Cookies), Promise.allSettled orchestration with 8s/25s timeouts, partial reports, 30-day TTL, zero body/cookie value storage. Verified on W1 (422), W2 (400), W3 (live). |
| **CP-10** | Sana | 2026-11-14 | `cp-10-done` | Website Auditor screen (`/website-auditor`), mandatory authorisation checkbox, scope disclosures, 25s progress feedback, results grouped into 4 categories, partial banner naming unassessed checks, friendly `TARGET_BLOCKED` copy, 0 axe violations, Vitest unit suite, Playwright journeys. |
| **CP-11** | Sana | 2026-11-14 | `cp-11-done` | History list, report actions, and platform dashboard. Backend `GET /api/scans` (filter/paginate), `GET /api/dashboard/summary` ($facet aggregation, sub-tag `cp-11a-done`), `DELETE /api/scans/:scanId`. Frontend `/history` with URL-synced filters/pagination; report actions (copy Markdown, copy JSON, print stylesheet, delete modal); `/` dashboard with stat cards, Recharts donut & bar charts, recent scans table. 21 E2E tests green. |
| **CP-12** | upendra-devhub | 2026-11-14 | `cp-12-done` *(pending human tag)* | Security and abuse hardening (rate limits, payload limits, CORS, cookie flags, logger redaction, Gitleaks clean, SSRF regression), accessibility and polish (Help page `/help`, error boundaries `error.tsx` & `not-found.tsx`, SVG favicon, metadata), production configuration (multi-stage `backend/Dockerfile`, `.dockerignore`, graceful shutdown, `render.yaml`, `vercel.json`), Golden Journeys suite (27 E2E tests green), complete documentation (`README.md`, `architecture.md`, `security-notes.md`, `demo-script.md`, `HANDOFF.md`). Version `v1.0.0` ready. |

---

## CP-12 Task Commits (Direct to `main`)
1. `20d5ecd`: `CP-12: complete security and abuse hardening`
2. `a139879`: `CP-12: finish accessibility and application polish`
3. `f155d10`: `CP-12: prepare production configuration and deployment`
4. `099f57d`: `CP-12: verify live golden journeys`
5. `dc55592`: `CP-12: complete project and release documentation`
6. *(current)*: `CP-12: finalize handoff and release preparation`

---

## Decisions
1. **Direct `main` Branch Override:** Per human developer prompt instructions, CP-12 work was conducted directly on `main` without creating a separate `cp-12-harden-ship` branch, pull request, or merge commit.
2. **Human Release Tagging:** Release tags `cp-12-done` and `v1.0.0` are reserved for the human developer upon final gate review, avoiding automated tagging conflicts.
3. **PostCSS Override:** Added npm override `"overrides": { "postcss": "^8.5.33" }` in root `package.json` to resolve high-severity vulnerabilities (GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q) across Next.js and Tailwind without breaking upgrades.
4. **Zod Vulnerability Evaluation:** Retained `zod@3.25.76` and formally proved non-exploitability of GHSA-mrhx-c7xc-m3w5 (resource consumption via unbounded collections) because Threatory enforces a 20 KB body-parser limit and all array schemas have explicit length constraints. Upgrading to Zod 4 was evaluated and rejected due to breaking API changes in error structures and `@hookform/resolvers`.
5. **Gitleaks Ignore for Test Fixtures:** Added `.gitleaksignore` cataloging synthetic unit test tokens (RFC 7519 JWT example and mock Slack bot token) used in test suites, confirming zero real leaked credentials across all 96+ commits.
6. **Graceful Shutdown Lifecycle:** Enhanced `backend/src/server.ts` with atomic shutdown guards (`isShuttingDown`), a 10-second unreferenced force-exit timeout, feed scheduler termination, HTTP server drain, and clean Mongoose disconnection.
7. **SVG Favicon Route:** Added scalable SVG brand icon at `frontend/src/app/icon.svg` providing native Next.js App Router favicon generation without external image dependencies.
8. **Help Page Architecture:** Expanded `frontend/src/app/help/page.tsx` into a comprehensive 8-section guide explaining methodology, analyzer scopes, storage rules, retention, and responsible use.
9. **Endpoint Status Code Consistency:** Retained `POST /api/scans/url` returning HTTP 201 (Created) and `POST /api/scans/website` / `POST /api/scans/privacy` returning HTTP 200 (OK) to maintain complete backward compatibility with established contracts and tests.

---

## Contract Changes
None. `@threatory/contracts` implemented strictly per specification; zero breaking schema changes were required.

---

## Dependencies Added / Modified
- Modified in root `package.json`: Added `"overrides": { "postcss": "^8.5.33" }` to eliminate PostCSS vulnerabilities.
- No new external runtime production dependencies added.

---

## Known Issues

1. **`npm audit` Advisory (Zod <4.6.6 / GHSA-mrhx-c7xc-m3w5):**
   - **Severity:** High
   - **Impact:** Uncontrolled resource consumption if an attacker submits an unbounded array to an unconstrained Zod array schema.
   - **Mitigation:** Provably non-exploitable in Threatory: Threatory's Express middleware enforces a 20 KB JSON payload cap, and all request schemas enforce strict array boundaries (`profiles.max(10)`). Upgrading to Zod 4 is a breaking change.
   - **Release Blocking:** No. Documented as a demonstrable non-exploitable finding.
2. **Next.js ESLint Build Notice:**
   - **Severity:** Low (informational warning during `next build`).
   - **Impact:** Next.js build emits `The Next.js plugin was not detected in your ESLint configuration`.
   - **Mitigation:** The monorepo uses ESLint 9 flat config across all workspaces. Compilation and typechecks pass with 100% success (10/10 routes built).
   - **Release Blocking:** No.
3. **Windows Sandbox Loopback Sockets:**
   - **Severity:** Low (environmental notice).
   - **Impact:** In highly restricted Windows sandbox terminals without network bypass, local `127.0.0.1` sockets may encounter `EACCES`.
   - **Mitigation:** Running in standard terminal environments with network permissions allows full socket binding.
   - **Release Blocking:** No.

---

## Parking Lot
- Unify scan creation endpoint status codes (`201 Created` across all three analyzers) in a future v2.0 breaking release.
- Dark mode theme toggle.
- Multi-language localization (i18n).
