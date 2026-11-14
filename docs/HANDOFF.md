# HANDOFF

## Baton
Current owner: upendra-devhub            Updated: 2026-11-14
Status: READY
Last completed: CP-10 (tag `cp-10-done`)
Current checkpoint: CP-10 completed, next is CP-11
Current branch: `main`

## Exact next step
The next checkpoint is **CP-11 — History & Dashboard screen**.
- Person A takes the baton to implement the History list screen (`/history`) and Dashboard summary screen (`/`).
- Connect to `GET /api/scans` for owner-scoped history with pagination (page, limit) and module filter.
- Support report deletion via `DELETE /api/scans/:scanId` with confirmation dialog and optimistic/invalidated query refresh.
- Connect to `GET /api/dashboard/summary` to render scan totals, module breakdown, and risk distribution using Recharts.
- Maintain full accessibility (`vitest-axe` with 0 violations) and end-to-end user journeys for history and dashboard.

## Privacy Module Reference (CP-07 & CP-08)
- **Rules Version:** `privacy-1.0.0`
- **Module Location (Backend):** `backend/src/modules/privacy/`
  - `normalise.ts`: Input normalization, consent verification, local profile URL parsing, and display-name fragment extraction.
  - `masking.ts`: Zero-leakage masking utilities for emails, phone numbers, tokens, cards, and usernames.
  - `rules.config.ts`: Centralized rule metadata and configuration descriptors for all 9 privacy rules.
  - `rules.ts`: Deterministic detection engine executing all 9 exposure rules with local validation (Luhn algorithm, `validator.isEmail`, `libphonenumber-js`).
  - `service.ts`: Privacy report generation, assessment without numeric score, safe target summary, and mandatory privacy limitations.
  - `index.ts`: Public module exports.
- **Screen Location (Frontend):** `frontend/src/features/privacy/`
  - `components/PrivacyScanForm.tsx`: React Hook Form + Zod resolver, dynamic profile rows (1-10), live 10,000 char counter, consent enforcement.
  - `components/ProfileFields.tsx`: Dynamic profile row array with platform suggestions, username, optional URL, and deletion protection on single rows.
  - `components/PrivacyScopeNotice.tsx`: Landmark region detailing what is and is not analyzed; explicit warnings against passwords/IDs.
  - `components/ConsentCheckbox.tsx`: Accessible explicit consent confirmation checkbox.
  - `components/PrivacyScanProgress.tsx`: Politeness-aware progress feedback state.
  - `components/PrivacyResult.tsx`: Masked report presentation, limitations panel, and navigation to saved report.
  - `hooks/usePrivacyScan.ts`: TanStack Query mutation hook managing submission, error mapping, and memory-only retry state.

### Active Privacy Finding Codes (9 total)
1. `PRIV_USERNAME_REUSE` (identity, low/medium, warn): The same username was supplied across 2 (low) or 3+ (medium) profiles.
2. `PRIV_USERNAME_SIMILAR` (identity, low, warn): Distinct usernames with edit distance 1 and length >= 5.
3. `PRIV_URL_USERNAME_MISMATCH` (identity, low, warn): Typed username differs from supported profile URL username (GitHub, X/Twitter, Instagram, LinkedIn `/in/`, Reddit `/user/`).
4. `PRIV_USERNAME_PERSONAL_HINT` (identity, low, warn): Username contains display-name fragment (>= 4 chars) or plausible birth year suffix (1940-2026).
5. `PRIV_EMAIL_FOUND` (contact, medium, warn): Valid email detected in submitted text via `validator.isEmail`.
6. `PRIV_USERNAME_MATCHES_EMAIL` (correlation, medium, warn): Normalised username matches normalised local part of detected email.
7. `PRIV_PHONE_FOUND` (contact, medium, warn): Valid phone number detected in submitted text via `libphonenumber-js` (excluding payment card spans).
8. `PRIV_SECRET_FOUND` (credentials, high, fail): Exposed AWS key (`AKIA`), GitHub token (`gh[pousr]_`), Slack token (`xox[baprs]-`), Google API key (`AIza`), private key block, or JWT pattern. Mandatory recommendation: revoke and rotate.
9. `PRIV_CARD_FOUND` (financial, high, fail): 13-19 digits passing the Luhn algorithm checksum.

### Masking Formats
- **Email:** Revealing at most the first character of the local part: `j***@example.com`.
- **Phone:** Revealing only the final two digits: `+1 *** *** **53`.
- **Token:** Type prefix and first 4 characters: `AWS key: AKIA********`, `GitHub token: ghp_********`, `Slack token: xoxb********`, `Google API key: AIza********`, `Private key: [REDACTED PRIVATE KEY BLOCK]`, `JWT: eyJh********`.
- **Card:** Revealing only the final 4 digits: `**** **** **** 1111`.
- **Username:** Boundary characters only: `J***e`.

### Stored-Data & Retention Rules
- **Absolute No-Storage Rule:** Raw privacy input (`submittedText`, unmasked usernames, display names, raw emails, phones, tokens, card numbers) is **never** stored, logged, or returned.
- **Database Schema Guarantee:** `submittedText` does **not** exist as a field in stored MongoDB documents (`Scan` collection).
- **Retention:** Privacy scan reports expire after 7 days (`expiresAt = createdAt + 7 days`).
- **Zero Network:** Scan evaluation performs zero outbound HTTP/HTTPS or DNS requests; all URL parsing and validations are local.

## Website Module Reference (CP-09)
- **Rules Version:** `website-1.0.0`
- **Module Location (Backend):** `backend/src/modules/website/`
  - `ssrf-guard.ts`: RFC-compliant IP validation (`ipaddr.js`), undici custom connector with IP pinning to prevent DNS rebinding, manual 3-hop redirect follower with per-hop SSRF validation, 256KB read cap, 3-concurrency limit (`p-limit`).
  - `rules.config.ts`: Metadata, descriptions, scoring weights, categories, and recommendation templates for all 20 active website finding codes.
  - `tls-checker.ts`: TLS certificate and protocol checks (`tls.connect` with SNI, exact OpenSSL `authorizationError`, cert validity, protocol detection TLS 1.0-1.3, expiry calculation, redirect/HTTP check).
  - `http-checker.ts`: Safe HTTP fetch via SSRF guard, 7 security headers (`SITE_HSTS`, `SITE_CSP`, `SITE_XCTO`, `SITE_FRAMING`, `SITE_REFERRER_POLICY`, `SITE_PERMISSIONS_POLICY`, `SITE_VERSION_DISCLOSURE`), 3 cookie security checks (`SITE_COOKIE_SECURE`, `SITE_COOKIE_HTTPONLY`, `SITE_COOKIE_SAMESITE`).
  - `dns-checker.ts`: DNS resolution (`SITE_DNS_RESOLVES`), email DNS authentication checks (`SITE_SPF`, `SITE_DMARC`, `SITE_CAA`) with 5s DNS timeout.
  - `service.ts`: Scan orchestration via `Promise.allSettled`, 8s per-check timeout, 25s overall budget, partial report generation on timeout, risk level computation (no score is computed for website scans), 30-day retention (`expiresAt = createdAt + 30 days`), zero cookie values and zero response bodies stored.
  - `index.ts`: Public module exports.

### Active Website Finding Codes (across 4 categories)
1. **DNS (4 codes):**
   - `SITE_DNS_RESOLVES`: Target hostname resolves via system DNS A/AAAA lookup.
   - `SITE_SPF`: Target apex domain defines a valid SPF (`v=spf1`) record in DNS TXT.
   - `SITE_DMARC`: Target domain or apex publishes a valid DMARC (`v=DMARC1`) policy at `_dmarc.<domain>`.
   - `SITE_CAA`: Target domain or apex publishes CAA records restricting authorized CAs.
2. **TLS (6 codes):**
   - `SITE_HTTPS_AVAILABLE`: Target responds over TLS on port 443.
   - `SITE_TLS_CERT_VALID`: TLS certificate chain validates against standard trusted CAs (or specific CA bundle).
   - `SITE_TLS_EXPIRY`: Warn medium within 14 days (or expired), warn low within 30 days, otherwise pass.
   - `SITE_TLS_PROTOCOL`: Pass on modern TLS (TLS 1.2 or 1.3), warn (medium) on older protocols, never fail (not_assessed on connection failure).
   - `SITE_HTTP_TO_HTTPS`: Plain HTTP requests redirect automatically to HTTPS.
   - `SITE_REDIRECTS`: Warn when more than 3 hops, or the chain leaves the registrable domain; otherwise pass.
3. **Headers (7 codes):**
   - `SITE_HSTS`: Missing (medium) or max-age under 15552000 (low); otherwise pass.
   - `SITE_CSP`: Content-Security-Policy missing (medium) or allows unsafe-inline/unsafe-eval in script-src/default-src (low); otherwise pass.
   - `SITE_XCTO`: `X-Content-Type-Options: nosniff` header present.
   - `SITE_FRAMING`: Anti-clickjacking protection via CSP `frame-ancestors` or `X-Frame-Options: DENY|SAMEORIGIN`.
   - `SITE_REFERRER_POLICY`: `Referrer-Policy` header restricts referrer leakage (`strict-origin-when-cross-origin`, `no-referrer`, etc.).
   - `SITE_PERMISSIONS_POLICY`: `Permissions-Policy` header restricts sensitive browser features (e.g. geolocation, camera).
   - `SITE_VERSION_DISCLOSURE`: Server does not disclose granular software versions in `Server` or `X-Powered-By` headers.
4. **Cookies:**
   - When no `Set-Cookie` header is present on the checked response, emits a single pass finding: `SITE_COOKIE_SECURE` (`outcome: "pass"`, `severity: "info"`, evidence: "No Set-Cookie header observed on the checked response").
   - When cookies are present, evaluates up to three rules per cookie name:
     - `SITE_COOKIE_SECURE`: Missing on an HTTPS response (medium).
     - `SITE_COOKIE_HTTPONLY`: Missing (medium if auth/session-like name, otherwise low).
     - `SITE_COOKIE_SAMESITE`: Missing or None (low).

### Test Injection Points
- `AddressPolicy`: Pluggable IP validator function `(ip: string) => boolean`. In production, defaults to `isPublicUnicastAddress` (`ssrf-guard.ts`); test suites inject custom policies to allow local test servers (`127.0.0.1`) while testing SSRF enforcement separately.
- `DnsResolver`: Pluggable DNS A/AAAA resolver. In production, defaults to `dns.promises.lookup`; tests inject mock resolvers to simulate DNS failures and timeouts.
- `EmailDnsResolver`: Pluggable TXT and CAA DNS resolvers (`resolveTxt`, `resolveCaa`). In production, defaults to `dns.promises`; tests inject canned records or simulated errors.
- `customCa`: Array of CA buffers passed to `tls.connect` and `undici.Agent` to validate self-signed certificates in automated test suites without weakening production CA trust.
- `allowCustomPort`: Boolean flag allowing test servers on ephemeral ports (e.g. 8443, 3000) while production strictly requires standard ports 80 and 443.

### Timeout & Limit Values
- **TCP Connect Timeout:** 5 seconds (`connectTimeoutMs: 5000`)
- **HTTP Request Timeout:** 10 seconds (`requestTimeoutMs: 10000`)
- **Per-Check Orchestration Timeout:** 8 seconds (`CHECK_TIMEOUT_MS = 8000`)
- **Overall Scan Budget:** 25 seconds (`OVERALL_SCAN_BUDGET_MS = 25000`)
- **Read Body Cap:** 256 KB (`MAX_BODY_BYTES = 262144`)
- **Max Redirects:** 3 hops (`MAX_REDIRECTS = 3`)
- **Concurrency Limit:** 3 concurrent requests (`CONCURRENCY_LIMIT = 3`)

### Manual Online Test (Golden Input W3)
- **Target URL:** `https://example.com`, `authorised: true`
- **Execution:** `POST /api/scans/website` with JSON payload `{"url": "https://example.com", "authorised": true}`
- **Observed Result:**
  - Status: `"completed"`
  - Score: None (score is omitted for website scans per Appendix A/B3; URL module only)
  - Risk Level: `medium` (due to missing HSTS on example.com)
  - Certificate: Valid X.509 certificate issued by DigiCert / SSL Corporation to `example.com`, negotiated protocol TLSv1.3.
  - Finding Groups: All 4 groups populated (`dns`: 4 findings, `tls`: 6 findings, `headers`: 7 findings, `cookies`: 1 finding [single pass] = 18 total findings).

### Stored-Data & Retention Rules
- **Absolute No-Storage Rule:** Response bodies and cookie values are **never** stored, logged, or returned in findings or reports. Cookie analysis retains only cookie name, secure/httpOnly flags, and sameSite attribute.
- **Retention:** Website scan reports expire after 30 days (`expiresAt = createdAt + 30 days`).
- **Owner Identification:** Associated with signed HttpOnly cookie `tid` or `DEV_OWNER_ID`.

## Website Auditor Screen Reference (CP-10)
- **Screen Location (Frontend):** `frontend/src/features/website/` and `frontend/src/app/website-auditor/page.tsx`
  - `components/WebsiteAuditorView.tsx`: Main view coordinating page header, scope notice, form, progress state, error feedback, and result presentation.
  - `components/WebsiteScanForm.tsx`: React Hook Form + Zod resolver validating `url` and mandatory `authorised: true` checkbox before submission.
  - `components/AuthorisationCheckbox.tsx`: Accessible mandatory confirmation checkbox with exact text "I own this site or have permission to assess it".
  - `components/WebsiteScopeNotice.tsx`: Landmark region explaining passive security assessment vs excluded exploits/payloads.
  - `components/WebsiteScanProgress.tsx`: Status indicator announcing that the passive audit can take up to 25 seconds.
  - `components/CertificateCard.tsx`: Structured plain-text display of TLS certificate details (subject, issuer, valid from/to, protocol, days remaining, authorized status).
  - `components/WebsiteResult.tsx`: Result container with grouped findings, certificate summary, and limitations.
  - `hooks/useWebsiteScan.ts`: TanStack Query mutation hook managing submission to `POST /api/scans/website`, 30s timeout, sanitized error mapping, and memory-only retry state.

### How Partial and Blocked States are Tested
- **Blocked State (TARGET_BLOCKED):**
  - Tested in unit suite (`frontend/tests/website-auditor.test.tsx`) with mocked 422 `TARGET_BLOCKED` response.
  - Tested in E2E suite (`e2e/src/website-auditor.spec.ts`) against the real backend using Golden Input W1 (`http://127.0.0.1` with authorisation checked).
  - Verifies that error copy displays EXACTLY: `"This address cannot be audited because it is not a public website"`, with zero internal IP, port, interface, or server details exposed.
- **Partial State (not_assessed findings):**
  - Tested in unit suite using `website-report-partial.json` contract fixture.
  - Tested in E2E suite using Playwright route interception (`page.route`) delivering `website-report-partial.json`.
  - Verifies that `PartialBanner` explicitly names the unassessed check (`SITE_DMARC`), `not_assessed` has a distinct visual badge (`CircleDashed`, label "Not assessed", dashed border), and is never counted or shown as pass.
- **Authorisation Enforcement:**
  - Tested in both unit and E2E suites: submitting without checking "I own this site or have permission to assess it" blocks submission with client-side error "You must confirm authorisation to audit this website" and prevents outbound network requests.
- **Strict Plain-Text Invariant:**
  - Tested in both unit and E2E suites: submitted URLs and certificate subjects are rendered as plain text and never wrapped in `<a href="...">` or `<Link>`.

### Manual Online Test Steps (Golden Input W3)
To run the online check against a live public website (`https://example.com`):
1. **Prerequisites:** Ensure internet connectivity is available.
2. **Start Backend Server:**
   `npx tsx backend/tests/e2e-server.ts`
   (or `npm start -w backend` with MongoDB running on `127.0.0.1:27017`)
3. **Start Frontend Dev Server:**
   `npm run dev -w frontend` (runs on `http://localhost:3000`)
4. **Open Browser:**
   Navigate to `http://localhost:3000/website-auditor`.
5. **Fill Form:**
   - URL: `https://example.com`
   - Checkbox: Tick "I own this site or have permission to assess it".
6. **Submit:**
   Click "Audit website". Observe progress message: "Auditing website security configuration... A scan can take up to 25 seconds to complete."
7. **Verify Results:**
   - Status: Completed (or partial if upstream DNS restricts queries).
   - Groups: All four groups render: "Connection and TLS", "HTTP headers", "Cookies", and "DNS and email".
   - Certificate: Certificate summary card displays subject (`example.com`), issuer, valid dates, protocol (`TLSv1.3`), days remaining, and Authorized badge.
   - Assessment: Shows assessment summary label ("Medium" or "Low") with NO numeric score.
   - Target URL: Displayed as plain text without any clickable external link.
   - Saved Report: "Open saved report" button navigates to `/reports/[scanId]`.
*(Automated verification of W3 against live servers was executed and confirmed green: `1 passed (39.5s)`).*

## How to run (keep accurate)
Node version: 22 (per `.nvmrc`; verified locally on Node `v22.23.4`)
Workspaces: `packages/contracts` (`@threatory/contracts`), `backend`, `frontend`, `e2e`
Install: `npm ci`
Verify: `npm run verify` (builds contracts, lints, typechecks, tests all workspaces, and builds contracts, backend, frontend Next.js production build, and e2e)
E2E tests: `npm run e2e` (starts in-memory MongoDB test server, backend test instance on port 4001, frontend on port 3000, executes Playwright browser journeys, and cleanly shuts down)
Lint: `npm run lint` | Typecheck: `npm run typecheck` | Test: `npm run test` | Build: `npm run build`
Local database: `docker compose up -d` (or local `mongod` listening on `127.0.0.1:27017`)
Seed database: `npm run seed -w backend` (upserts the 9 contract report fixtures for `DEV_OWNER_ID`)
Start backend: `npm start -w backend` (listens on `PORT`, default `4000`)
Start frontend (dev): `npm run dev -w frontend` (listens on port `3000`)
Start frontend (prod): `npm run build -w frontend && npm start -w frontend`

### Data Refresh and Evaluation Commands (CP-06)
- Download / refresh Tranco Top 10,000 domains:
  `npm run data:tranco -w backend`
- Manual threat feed synchronization:
  `npm run feeds:sync -w backend`
- Evaluation run:
  `npm run eval:url -w backend`

## Checkpoint log
| CP | Owner | Finished | Tag | Notes |
|---|---|---|---|---|
| CP-01 | Person A | 2026-11-11 | `cp-01-done` | Monorepo workspaces, contracts, fixtures, golden-inputs, Vitest tests, GitHub Actions CI |
| CP-02 | Person B | 2026-11-11 | `cp-02-done` | Express API, Mongoose connection, Scan model with TTL/indexes, anonymous owner cookie + `DEV_OWNER_ID`, scan repository & routes (`GET`/`DELETE`), `docker-compose.yml`, seed script, Vitest/Supertest/MongoMemoryServer suites |
| CP-03 | Person A | 2026-11-11 | `cp-03-done` | Next.js 15 App Router shell, light design system, `/api/:path*` rewrite, typed Zod-validated API client, TanStack Query provider, shared report components, `/reports/[scanId]` saved-report page, `ApiStatusIndicator`, Vitest/RTL/`vitest-axe` tests |
| CP-04 | Person A | 2026-11-12 | `cp-04-done` | URL normaliser (`WHATWG URL` + `tldts`), 11 core detection rules (`url-1.0.0`), weighted scoring engine, `POST /api/scans/url` endpoint with 30-day TTL persistence, zero-network isolation tests, golden inputs U1 to U4 |
| CP-05 | Person A | 2026-11-13 | `cp-05-done` | URL Analyzer screen (`/url-analyzer`), React Hook Form + `UrlScanRequest`, `useUrlScan` mutation hook, `URLDetailsCard`, strict plain-text URL rendering, `ErrorState` with retry, Playwright E2E infrastructure with in-memory MongoDB server, vitest-axe accessibility |
| CP-06 | Person B | 2026-11-13 | `cp-06-done` | URL advanced detection (`URL_LOOKALIKE`, `URL_HOMOGRAPH`, `URL_BRAND_SUBDOMAIN`, `URL_SHORTENER`, `URL_FEED_MATCH`), Tranco 10k dataset (`top-domains.txt`), OpenPhish & URLhaus sync, node-cron scheduler (`FEEDS_SYNC_ENABLED`), evaluation framework (`docs/evaluation-url.md`, 0.00% FPR), bumped to `url-1.1.0` |
| CP-07 | Person A | 2026-11-13 | `cp-07-done` | Privacy Exposure Analyzer engine & endpoint (`POST /api/scans/privacy`), local profile URL parsing, 9 detection rules (`privacy-1.0.0`), sensitive value masking, zero raw storage (`submittedText` never persisted), 7-day TTL retention, golden inputs P1-P4, comprehensive privacy leakage test |
| CP-08 | Person A | 2026-11-13 | `cp-08-done` | Privacy Analyzer screen (`/privacy-analyzer`), dynamic profile rows (1-10 with removal safeguards), visible scope notice landmark (no password field exists), mandatory consent enforcement, zero browser storage leaks (`localStorage`, `sessionStorage`, `IndexedDB`, URL query/hash), safe masked report presentation, error/retry input preservation, and Playwright end-to-end journeys (P1, P2, reload persistence, mobile viewport) |
| CP-09 | Sana | 2026-11-13 | `cp-09-done` | Website Auditor engine, SSRF guard (RFC compliance, undici pinned connector, 3-hop redirect guard), 20 detection rules (DNS, TLS, Headers, Cookies), Promise.allSettled orchestration with 8s/25s timeouts, partial reports on timeout, POST /api/scans/website endpoint, 30-day TTL, zero response body/cookie value storage, verified on golden inputs W1 (422), W2 (400), W3 (live completed) |
| CP-10 | Sana | 2026-11-14 | `cp-10-done` | Website Auditor screen (`/website-auditor`), mandatory authorisation checkbox ("I own this site or have permission to assess it"), plain-text scope disclosures, 25s progress feedback, results grouped into 4 categories (Connection and TLS, HTTP headers, Cookies, DNS and email), certificate summary card, partial banner naming unassessed checks, friendly TARGET_BLOCKED copy, zero score fabrication, strict plain-text URL rendering, 0 axe violations, Vitest unit/accessibility suite (16 tests), and Playwright E2E journeys (W1 blocked, mocked partial, authorisation enforcement, responsive layout) |

## Decisions
1. `main` was created after CP-01 at `cp-01-done` (`c9a832c`) because the pre-CP-01 setup step existed only in the PDF. History unchanged.
2. Used ESLint 9 flat config (`eslint.config.mjs`) with `typescript-eslint` v8 for type-aware linting across all monorepo workspaces.
3. In `packages/contracts`, used `superRefine` on `Finding` to enforce requirement that `recommendation` is required when `outcome` is `"warn"` or `"fail"` per Rule 46 and Appendix A.
4. Created `backend/tsconfig.build.json` emitting to `dist` so that `backend` builds cleanly with standard `tsc`.
5. Configured configurable trust proxy handling in Express via `TRUST_PROXY` environment variable.
6. Implemented anonymous owner identification using Node.js `crypto.randomUUID()` set in signed HttpOnly cookie `tid` with SameSite Lax (`Secure` in production); `DEV_OWNER_ID` overrides `req.ownerId` in development/test.
7. Centralized `ApiError` format mapping with `AppError` and `formatZodError` ensuring error responses never return stack traces.
8. Used Tailwind CSS v3 (`tailwindcss` ^3.4) with `tailwind.config.ts`, `postcss.config.mjs`, CSS variable design tokens, and `shadcn/ui` primitives (`Button`, `Badge`, `Card`, `Alert`, `Skeleton`) to avoid PostCSS v4 compatibility issues with Next.js 15 + Vitest.
9. Validated `GET /api/health` in `checkApiHealth()` against the actual CP-02 response `{ status: "ok", timestamp }` rather than `ApiSuccess`, matching the backend implementation.
10. Placed a single `ApiStatusIndicator` inside the shared `<header>` of `AppShell` (instead of duplicating it inside both sidebar and mobile drawer) so only one `role="status"` landmark and live region exist in the DOM across viewports.
11. Set `retry: false` in `useReportQuery` and `useApiHealth` so errors transition immediately to `ErrorState` / `Unavailable` without hidden retry delays and the manual Retry button triggers an immediate `refetch()`.
12. Branched `cp-03-frontend-foundation` from `main` (`9714e16`) per user instruction after `cp-02-done` was still untagged; installed `fnm` + Node `v22.23.4` and verified CP-02 live using the cached `mongod` 7.0.24 binary on `127.0.0.1:27017` since Docker was not installed on the machine.
13. CP-04 started from the main tip, which includes the CI fix after cp-03-done, rather than from the tag itself.
14. CI was red from CP-02 Task 1 to cp-03-done because @threatory/contracts was not built before typecheck on a fresh clone. Fixed in the commit 'fix: build contracts before verify so fresh clones pass CI' (verify builds contracts first, plus a root postinstall). The commits behind cp-02-done and cp-03-done were verified red on fresh clones at the time.
15. In `backend/src/modules/url/normalise.ts`, WHATWG URL parser handles dotted decimal, octal, hex, and integer IPv4 hosts and IPv6 literals into standard normalized hostnames; `isIpHost` is flagged via `tldts.isIp` and `net.isIP`. Non-http/https, malformed, empty, and strings exceeding 2048 characters are rejected as 400 `VALIDATION_ERROR` with field path `url`.
16. In `backend/src/modules/url/rules.ts`, all 16 detection rules always emit a finding in fixed order; score is capped at 100 with risk level derived per Appendix B1 (0-14 none_detected, 15-39 low, 40-69 medium, 70-100 high). Every warn and fail finding contains evidence, explanation, and an actionable recommendation. A feed match forces risk level to `high` and score to 100.
17. The brief says riskLevel is the highest severity found, but B1 and golden input U1 derive the URL level from score bands (U1 has a high-severity fail yet expects medium). CP-04 and CP-06 follow B1 and U1.
18. In CP-05, `submitUrlScan` was integrated directly into `frontend/src/lib/api-client.ts`, generalizing `performRelativeFetch` to support configurable HTTP method, payload, and headers while maintaining strict typed schema validation via `ApiSuccess(Report)` and `ApiError`.
19. E2E backend server (`backend/tests/e2e-server.ts`) runs on dedicated test port `4001` with an isolated `MongoMemoryServer` instance and test-only secrets, completely decoupled from any live developer database. `DEV_OWNER_ID` is omitted in E2E so real signed HttpOnly `tid` owner cookies are validated across navigations and reloads.
20. In `URLAnalyzerView`, `CardTitle` is rendered with `as="h2"` beneath `PageHeader`'s `h1` to guarantee proper heading hierarchy and 0 axe violations.
21. Strict plain-text URL rendering was implemented across all URL display components: the target URL is rendered in non-interactive code/text blocks with no external anchors, protecting against HTML injection and URL navigation.
22. In CP-06, Tranco dataset decompression was implemented using Node's built-in `node:zlib.inflateRawSync` directly on the deflated stream payload from the ZIP buffer, avoiding additional zip decompression npm packages.
23. In `checkLookalike`, authoritative domains present in the top-10,000 list are short-circuited as legitimate (distance 0 is not triggered) to protect authentic top sites from false positives. Length-difference pruning ($|L_1 - L_2| > \text{maxDist}$) guarantees sub-millisecond execution over 10,000 reference domains.
24. In `checkHomograph`, Unicode script categorization is performed using standard ES Unicode property escapes (`\p{Script=...}/u`) on the `domainToUnicode`-decoded labels to detect multi-script spoofing in addition to punycode (`xn--`) labels.
25. In `syncService.ts`, network requests enforce a 10MB payload size limit and 15-second timeout. Any network failure or HTTP error is caught, logged via `pino`, and recorded in `FeedSyncMeta` without throwing unhandled exceptions or affecting scan operations.
26. In CP-07, worked directly on `main` per prompt instructions with 6 task commits.
27. In CP-07, Privacy Analyzer computes `riskLevel` as the highest severity among triggered findings with score omitted per Appendix B2 and contracts; label is `"No exposure patterns detected"` or `"${N} exposure signals found"`.
28. In CP-07, payment card spans passing Luhn validation are mutually excluded from phone number detection in `findPhoneNumbersInText` to eliminate false-positive phone detections on credit card strings.
29. In CP-07, mandatory explicit consent (`consent === true`) is validated up front before any processing; missing or false consent immediately returns 400 `VALIDATION_ERROR` with field `consent`.
30. In CP-08, worked directly on `main` per prompt instructions with 6 granular task commits (`CP-08: <task>`).
31. Form limits and field validation: 1 to 10 profile rows (`useFieldArray`), platform (1-30 chars with datalist suggestions), username (1-64 chars regex `^[A-Za-z0-9._-]+$`), optional profile URL (up to 2048 chars), optional display name (up to 80 chars), and submitted text (up to 10,000 chars with live counter).
32. Consent enforcement: The submit button is strictly disabled until the consent checkbox is checked (`consent === true`). Submission is blocked if consent is unchecked.
33. Strictly no password inputs: Verified via component architecture, DOM assertion tests, and Playwright that zero `input[type="password"]` controls exist on the page.
34. Strict zero-storage invariant: Sensitive user inputs (`submittedText`, unmasked usernames, display names, raw contact/financial tokens) are never persisted to `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or URL query/hash parameters. Spies in unit tests and Playwright evaluations confirm zero storage calls.
35. Form input preservation on error: If the backend returns an error (validation error, rate limit, timeout, or server failure), entered values are preserved in-memory for immediate retry. On successful completion (`resetTrigger`), the form cleanly resets.
36. Masked presentation: Results omit numeric score boxes per privacy contract specifications, rendering only backend-returned sanitized evidence, "What was not checked" limitations, and direct link to the saved report `/reports/[scanId]`. Reopening `/reports/[scanId]` persists across browser reloads via the anonymous owner cookie.
37. `cp-08-done` tag was missing after CP-08. Local verify (slow DOM test timeout) and e2e (Journey 5 double-fill) failed on Windows; fixed test-only in commit `ba053e6`, then tagged `cp-08-done`.
38. In CP-09, implemented `ssrf-guard.ts` using `ipaddr.js` to enforce public unicast routing per RFC 1918, 3927, 4193, 4291, 5737, 6598, 6052, 3056, 1112, and 6890. Target URLs resolving to private, loopback, link-local, carrier-grade NAT, 6to4, or IPv4-mapped IPv6 are rejected with 422 `TARGET_BLOCKED`.
39. In `safeFetchWithUndici`, DNS rebinding attacks (time-of-check to time-of-use) are prevented by resolving DNS once through SSRF validation and pinning the resolved public IP via undici's `connector` using `net.connect({ host: resolvedIp, port })`.
40. Redirects are limited to at most 3 hops and followed manually; each redirect URL undergoes full SSRF validation before establishing any outbound connection.
41. Body reads are capped at 256 KB (`MAX_BODY_BYTES = 262144`) to protect against decompression and resource exhaustion attacks. Response bodies and cookie values are never logged, stored in MongoDB, or returned in API responses.
42. In `service.ts`, scan checks are orchestrated using `Promise.allSettled` bounded by an 8-second per-check timeout and a 25-second overall scan budget. If a check times out or fails unexpectedly, the scan returns status `"partial"` and emits `not_assessed` findings for the uncompleted checks, rather than failing the entire scan.
43. In `tls-checker.ts`, certificate inspection uses `tls.connect` with `rejectUnauthorized: false` to safely inspect self-signed or expired certificates without aborting, capturing exact OpenSSL error codes (`DEPTH_ZERO_SELF_SIGNED_CERT`, `CERT_HAS_EXPIRED`, etc.), validity dates, subject, issuer, and negotiated TLS protocol.
44. In `backend/src/routes/scans.ts`, `POST /api/scans/website` enforces `{ url, authorised: true }`. Input missing `authorised: true` or with invalid URL format immediately returns 400 `VALIDATION_ERROR` (W2); SSRF targets return 422 `TARGET_BLOCKED` (W1); valid authorized public targets return 200 `ApiSuccess(Report)` (W3). Note: `POST /api/scans/website` and `POST /api/scans/privacy` return 200, whereas `POST /api/scans/url` returns 201.
45. Contract fixtures `website-report-*.json` use `SITE_HEADER_HSTS` and `SITE_HEADER_CSP`, while the brief Appendix B3 and the CP-09 prompt name the codes `SITE_HSTS` and `SITE_CSP`. The backend follows Appendix B3. The contract schema accepts any string code, so both validate. CP-10 frontend must key on `SITE_*` codes from B3, not on the fixture names.
46. In follow-up fix commit `ccfb07b` on `main` ("fix(CP-09): align website labels, cookie finding and HANDOFF with brief"): aligned website assessment labels to exactly "Low", "Medium", "High" (keeping "No configuration issues observed" for none_detected) per Appendix B3; updated cookie evaluation to emit a single pass finding (`SITE_COOKIE_SECURE`) when no `Set-Cookie` header is present on the checked response.
47. In CP-10, worked directly on `main` branch per user override, creating granular task commits (`CP-10: <task>`).
48. Configured `submitWebsiteScan` client timeout to 30,000ms (`DEFAULT_WEBSITE_REQUEST_TIMEOUT_MS`) to accommodate the backend's 25-second overall scan budget without premature client-side aborts.
49. Generalized `FindingGroup` with an optional `categoryLabels` prop, mapping website categories to exact brief headings: `tls` -> "Connection and TLS", `headers` -> "HTTP headers", `cookies` -> "Cookies", `dns` -> "DNS and email", dynamically rendering whatever findings the backend returns.
50. Enhanced `PartialBanner` with an `unassessedChecks` prop to explicitly list unassessed check codes and titles.
51. Aligned `TARGET_BLOCKED` error copy across `api-client.ts` and `useWebsiteScan.ts` to exactly: `"This address cannot be audited because it is not a public website"`, stripping all internal IP, port, and network details.

## Contract changes
None. Schemas implemented strictly per Appendix A and Appendix C; no changes to `packages/contracts` were required.

## Dependencies added
### Root / Workspace dependencies (CP-01 & CP-05)
- `zod` (^3.23.8, MIT): Runtime schema declaration and validation library.
- `typescript` (^5.6.3, Apache-2.0): Static typing for all workspaces.
- `vitest` (^2.1.4, MIT): Fast unit and contract test runner.
- `eslint` (^9.14.0, MIT) & `typescript-eslint` (^8.14.0, MIT): Linter for strict TypeScript.
- `prettier` (^3.3.3, MIT): Opinionated code formatting.
- `@types/node` (^22.9.0, MIT): Node.js type definitions.
- `tsx` (^4.23.15, MIT): Added in CP-05 to execute the test-only backend E2E server (`backend/tests/e2e-server.ts`) with zero-config TypeScript compilation.

### Backend dependencies (CP-02, CP-04, CP-06, CP-07, CP-09)
- `express` (^4.21.1, MIT), `helmet` (^8.0.0, MIT), `cors` (^2.8.5, MIT), `express-rate-limit` (^7.4.1, MIT), `pino` (^9.5.0, MIT), `pino-http` (^10.3.0, MIT), `cookie-parser` (^1.4.7, MIT), `mongoose` (^8.8.1, MIT), `dotenv` (^16.4.5, BSD-2-Clause), `zod` (^3.23.8, MIT), `supertest` (^7.0.0, MIT), `mongodb-memory-server` (^10.1.2, MIT), and `@types/*` (`MIT`).
- `tldts` (^6.1.86, MIT): Added in CP-04 to accurately extract registrable domains, ICANN public suffixes, and identify IP hosts for the URL analyzer engine without external network dependencies.
- `fastest-levenshtein` (^1.0.16, MIT): Added in CP-06 for high-performance Levenshtein distance calculations in `URL_LOOKALIKE` typosquatting detection and reused in CP-07 for `PRIV_USERNAME_SIMILAR`.
- `node-cron` (^3.0.3, ISC) & `@types/node-cron` (^3.0.11, MIT): Added in CP-06 for scheduled daily threat feed synchronization.
- `validator` (^13.15.35, MIT) & `@types/validator` (^13.15.10, MIT): Added in CP-07 for RFC-compliant email address validation in `PRIV_EMAIL_FOUND`.
- `libphonenumber-js` (^1.13.16, MIT): Added in CP-07 for international phone number extraction and validation in `PRIV_PHONE_FOUND`.
- `ipaddr.js` (^2.2.0, MIT): Added in CP-09 for RFC-compliant IPv4 and IPv6 address parsing, range classification, and SSRF prevention.
- `undici` (^6.21.1, MIT): Added in CP-09 for low-level HTTP/HTTPS client fetching with custom pinned connectors, read caps, and safe manual redirect interception.
- `p-limit` (^6.2.0, MIT): Added in CP-09 for concurrency throttling (concurrency 3) during website inspection.
- `set-cookie-parser` (^2.7.1, MIT) & `@types/set-cookie-parser` (^2.4.10, MIT): Added in CP-09 for parsing `Set-Cookie` header attributes (Secure, HttpOnly, SameSite) without retaining cookie values.
- `selfsigned` (^3.0.0, MIT): Added in CP-09 for generating ephemeral X.509 certificates in TLS test suites.

### Frontend dependencies (CP-03 & CP-05)
- `next` (`15.5.29`, MIT): Next.js App Router framework and `/api` rewrite proxy.
- `react` & `react-dom` (`19.3.1`, MIT) + `@types/react` & `@types/react-dom` (`19.3.0`, MIT): UI runtime and strict TypeScript definitions.
- `@tanstack/react-query` (`5.107.1`, MIT): Async report fetching, caching, cancellation, retry, and health polling.
- `lucide-react` (`0.468.0`, ISC): Accessible UI icons.
- `zod` (`3.25.76`, MIT): Client-side contract parsing with `@threatory/contracts`.
- `tailwindcss` (`3.4.19`, MIT), `postcss` (`8.5.32`, MIT), `autoprefixer` (`10.6.2`, MIT): Utility-first light theme styling.
- `@radix-ui/react-slot` (`1.5.0`, MIT), `class-variance-authority` (`0.7.1`, Apache-2.0), `clsx` (`2.1.1`, MIT), `tailwind-merge` (`2.6.1`, MIT): `shadcn/ui` component composition utilities.
- `@vitejs/plugin-react` (`4.7.0`, MIT), `jsdom` (`25.0.1`, MIT), `@testing-library/react` (`16.3.3`, MIT), `@testing-library/jest-dom` (`6.9.1`, MIT), `@testing-library/user-event` (`14.6.9`, MIT), `vitest-axe` (`0.1.0`, MIT): Automated DOM, interaction, and accessibility test tooling.
- `react-hook-form` (^7.54.2, MIT): Added in CP-05 for URL scan form state management, validation error mapping, and submission handling.
- `@hookform/resolvers` (^3.10.0, MIT): Added in CP-05 as the Zod validation resolver for React Hook Form.

### E2E dependencies (CP-05)
- `@playwright/test` (^1.49.1, Apache-2.0): Cross-browser end-to-end test framework orchestrating isolated test environments and full user journeys.

## Known issues
1. `npm audit` reports vulnerabilities and `eslint@9.39.5` is flagged deprecated; not addressed in CP-02/CP-03/CP-04/CP-05/CP-06/CP-07. Do not run `npm audit fix --force`.
2. `next build` warns that `@next/eslint-plugin-next` is not configured in root `eslint.config.mjs` (deferred to avoid modifying root config outside scope).
3. On Windows terminal environments, running backend tests in Standard Sandbox mode (without bypass) encounters `EACCES` on loopback `127.0.0.1` sockets (used by Supertest/Express and MongoMemoryServer); running tests with elevated network permissions allows full socket binding.

## Parking lot
- Endpoint status code consistency: `POST /api/scans/website` and `/privacy` return 200, whereas `/url` returns 201 (revisit in CP-12).
- History pagination/filtering, report deletion UI, and dashboard summary with Recharts (`CP-11`).
- Dark mode toggle or theme customizer.
