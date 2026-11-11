# Checkpoints

| CP | Checkpoint | Area | Builds on | Saves as | Suggested |
|---|---|---|---|---|---|
| CP-01 | Repository, contract and handoff system | Full-stack | docs pack | cp-01-done | Person A |
| CP-02 | Backend foundation: server, database, ownership | Backend | cp-01-done | cp-02-done | Person B |
| CP-03 | Frontend foundation: shell, design system, report view | Frontend | cp-02-done | cp-03-done | Person A |
| CP-04 | URL Analyzer engine and endpoint | Backend | cp-03-done | cp-04-done | Person B |
| CP-05 | URL Analyzer screen and first end-to-end test | Frontend | cp-04-done | cp-05-done | Person A |
| CP-06 | URL advanced detection and evaluation | Backend | cp-05-done | cp-06-done | Person B |
| CP-07 | Privacy Analyzer engine and endpoint | Backend | cp-06-done | cp-07-done | Person A |
| CP-08 | Privacy Analyzer screen | Frontend | cp-07-done | cp-08-done | Person B |
| CP-09 | Website Auditor engine, SSRF guard and endpoint | Backend | cp-08-done | cp-09-done | Person A |
| CP-10 | Website Auditor screen | Frontend | cp-09-done | cp-10-done | Person B |
| CP-11 | History, report actions and dashboard | Full-stack | cp-10-done | cp-11-done | Person A |
| CP-12 | Hardening, deployment and documentation | Full-stack | cp-11-done | cp-12-done | Person B |

## CP-01 Repository, contract and handoff system
**Area:** Full-stack | **Builds on:** none (empty repository plus docs pack) | **Branch:** cp-01-repo-contract | **Saves as:** cp-01-done | **Suggested:** Person A

**Goal.** Create the monorepo skeleton, the shared contract package and the verification scripts so every later checkpoint starts from the same structure and vocabulary. No feature code.

**Tasks**
1. Create the npm-workspaces monorepo exactly as in the brief (`frontend/`, `backend/`, `packages/contracts/`, `e2e/`, `docs/`). Add `.nvmrc` (Node 22), `.gitignore` (node_modules, .env, dist, .next), `.editorconfig`, strict TypeScript config, ESLint and Prettier.
2. Implement the schemas in Appendix A in `packages/contracts` and export their types.
3. Add JSON fixtures that each parse with their schema: for every module a `completed`, a `partial` and a `failed` report; validation, not-found and rate-limit errors; a history page and an empty one; a dashboard summary and an empty one.
4. Add `golden-inputs.json` from Appendix C (inputs and expected finding codes as data).
5. Write contract tests (Vitest) that parse every fixture and reject malformed variants (a `warn` finding without a recommendation, a score outside 0 to 100, an unknown outcome).
6. Confirm the docs pack (`docs/PROJECT_BRIEF.md`, `HANDOFF.md`, `CHECKPOINTS.md`, `PROMPT_TEMPLATE.md`, `prompts/`) is present; do not rewrite it. Fill in HANDOFF.md "How to run".
7. Add root scripts: `verify` (lint, typecheck, test, build across workspaces; placeholder workspaces pass), `.env.example` files with placeholders only, and a GitHub Actions workflow that runs `npm run verify`.

**Allowed to change:** Whole repository (setup only).

**Must not change:** Any Express route, any Next.js page beyond the default placeholder, any analysis logic.

**Exit gate**
- [ ] Fresh clone, `npm ci`, `npm run verify` passes.
- [ ] Contract tests parse every fixture and reject the malformed variants.
- [ ] `golden-inputs.json` matches Appendix C.
- [ ] HANDOFF.md shows CP-01 complete with the verified run commands; CI is green.

**Handoff note.** Record the Node version, workspace names and the verify command; next step is CP-02.

## CP-02 Backend foundation: server, database, ownership
**Area:** Backend | **Builds on:** cp-01-done | **Branch:** cp-02-backend-foundation | **Saves as:** cp-02-done | **Suggested:** Person B

**Goal.** A secure Express API that connects to MongoDB, identifies an anonymous owner, and can read and delete saved reports for that owner only.

**Tasks**
1. Express and TypeScript app (`app.ts` exports the app, `server.ts` starts it). Validate environment with Zod at startup (`MONGODB_URI`, `PORT` default 4000, `FRONTEND_ORIGIN`, `COOKIE_SECRET`, `NODE_ENV`); fail fast on missing values. Refuse to start if `DEV_OWNER_ID` is set in production.
2. Middleware: helmet, cors (exact `FRONTEND_ORIGIN`, credentials), express-rate-limit (stricter on `/api/scans`), JSON body limit 20 kb, configurable `trust proxy`, pino-http with redaction of cookies, authorization header and request bodies.
3. Central error handler returning `ApiError` with the HTTP mapping from the brief; JSON 404 for unknown routes; a Zod helper that turns failures into `VALIDATION_ERROR` with `fields`. Never return stack traces.
4. `GET /api/health`.
5. Mongoose connection with clean failure handling. `Scan` model matching the contract plus `ownerId`, `rulesVersion`, `expiresAt`. Indexes: `ownerId + createdAt`, `ownerId + module + createdAt`, and a TTL index on `expiresAt`.
6. Owner middleware: signed HttpOnly cookie `tid` with a random ID (SameSite Lax, Secure in production) sets `req.ownerId`. In non-production, `DEV_OWNER_ID` overrides it.
7. Repository functions `create`, `getById`, `delete`, all requiring `ownerId`; another owner's ID behaves as not found. Routes `GET /api/scans/:scanId` and `DELETE /api/scans/:scanId`.
8. `docker-compose.yml` with MongoDB for local development, and `npm run seed -w backend` that inserts the contract fixtures for `DEV_OWNER_ID`.
9. Tests (Vitest, Supertest, mongodb-memory-server): health; JSON 404; validation envelope; no stack traces; two owners cannot read or delete each other's scans; TTL index exists; startup fails on a missing variable.

**Allowed to change:** `backend/**`, root `package.json` scripts, `docs/HANDOFF.md`.

**Must not change:** `frontend/**`, any analysis engine, scan POST routes, contract changes except logged bug fixes.

**Exit gate**
- [ ] `npm run verify` passes.
- [ ] `curl localhost:4000/api/health` returns 200; an unknown route returns an `ApiError` that parses with the contract schema.
- [ ] After `npm run seed -w backend`, `GET /api/scans/<id>` with the dev owner returns the fixture; a different owner gets 404.
- [ ] Starting with a missing env variable aborts with a clear message.
- [ ] No error response contains a stack trace; logs contain no cookie values.

**Handoff note.** Record the seed command, the seeded scan IDs and the dev owner setup; next step is CP-03.

## CP-03 Frontend foundation: shell, design system, report view
**Area:** Frontend | **Builds on:** cp-02-done | **Branch:** cp-03-frontend-foundation | **Saves as:** cp-03-done | **Suggested:** Person A

**Goal.** A responsive app shell, a typed API client and the shared report components, proven by a fully working report page that renders any saved report from the backend.

**Tasks**
1. Next.js App Router with TypeScript (strict), Tailwind, shadcn/ui, lucide-react and a TanStack Query provider. Placeholder routes: `/`, `/url-analyzer`, `/privacy-analyzer`, `/website-auditor`, `/history`, `/reports/[scanId]`, `/help`.
2. App shell: responsive navigation with Threatory branding, active state and page header. Professional light theme with restrained status colours.
3. `next.config` rewrites `/api/:path*` to `API_ORIGIN` (default `http://localhost:4000`); add `frontend/.env.example`.
4. API client in `src/lib/api-client.ts`: relative fetch with credentials, timeout, responses parsed with the contract schemas, `ApiError` codes mapped to friendly messages, a typed error, and an "unexpected response" error for malformed data.
5. Shared components in `src/components/reports`: `OutcomeBadge`, `SeverityBadge` (icon plus text, never colour alone), `FindingCard`, `FindingGroup` (by category), `AssessmentHeader` (label, riskLevel, optional score with meaning), `LimitationsPanel`, `PartialBanner`, `EmptyState`, `ErrorState`, skeleton loaders.
6. Make `/reports/[scanId]` fully work via `GET /api/scans/:scanId` with loading, not-found, error and retry states, and `details` shown as a simple key-value list.
7. A small "API status" indicator in the shell using `/api/health`.
8. Tests (Vitest, React Testing Library, vitest-axe): every contract fixture renders; `not_assessed` is visibly different from `pass`; client error mapping; shell navigation.

**Allowed to change:** `frontend/**`, `docs/HANDOFF.md`.

**Must not change:** `backend/**`, `packages/contracts` (except logged bug fixes), the module input forms.

**Exit gate**
- [ ] `npm run verify` passes.
- [ ] With the backend running and seeded, `/reports/<id>` renders the completed, partial and failed fixtures correctly; an unknown ID shows a not-found state.
- [ ] `not_assessed` findings are clearly distinct from `pass`; the whole app works by keyboard alone.
- [ ] The API status indicator turns to an error state when the backend is stopped.
- [ ] No axe violations in component tests.

**Handoff note.** Record the component list and how to view seeded reports; next step is CP-04.

## CP-04 URL Analyzer engine and endpoint
**Area:** Backend | **Builds on:** cp-03-done | **Branch:** cp-04-url-engine | **Saves as:** cp-04-done | **Suggested:** Person B

**Goal.** A deterministic URL analysis engine with the core rule set and scoring, exposed as `POST /api/scans/url`, saving reports that the existing report page can display.

**Tasks**
1. `modules/url/normalise.ts`: WHATWG URL plus tldts produce `{ original, scheme, host, registrableDomain, subdomainLabels, port, path, query, isIpHost }`. Reject non-http(s), malformed, empty and over-2048-character input as `VALIDATION_ERROR` with a field path.
2. `modules/url/rules.ts`: the **core** rules from Appendix B1. Each rule always emits one finding (`pass` when not triggered). Triggered severity `high` gives `fail`, otherwise `warn`, each with evidence, explanation and recommendation.
3. `rules.config.ts`: weights, thresholds, lists and `rulesVersion = "url-1.0.0"` in one file.
4. `service.ts`: normalise, run rules, score (capped sum), set `riskLevel` and label, build the report with `limitations` (link not visited, page content not analysed, reputation feeds not consulted) and `details` (`scheme`, `host`, `registrableDomain`, `subdomainLabels`, `port`, `queryParamNames`).
5. `POST /api/scans/url`: validate `UrlScanRequest`, run the service, save with `ownerId` and a 30-day `expiresAt`, return the saved report.
6. Tests: each rule positive and negative; normaliser cases (normal, IP literal in decimal, hex and octal, internationalised domain, userinfo, malformed); determinism; golden inputs U1 to U4; endpoint responses parsed with the contract schemas; a test that stubs `http`, `https` and `dns` to throw and proves the service performs no network I/O.

**Allowed to change:** `backend/src/modules/url/**`, `backend/src/routes`, `backend/tests`, `docs/HANDOFF.md`.

**Must not change:** `frontend/**`, privacy and website code, the advanced rules (lookalike, homograph, shortener, brand subdomain, feeds).

**Exit gate**
- [ ] `npm run verify` passes.
- [ ] Golden inputs U1 to U4 produce exactly the expected codes, score and risk level.
- [ ] `POST /api/scans/url` returns a report with a `scanId`; `GET /api/scans/<scanId>` returns the identical report; the same input twice gives identical findings.
- [ ] An invalid URL returns 400 `VALIDATION_ERROR` with the field path.
- [ ] The no-network test passes.

**Handoff note.** Record the rules version, the config file location and how to add a rule; next step is CP-05.

## CP-05 URL Analyzer screen and first end-to-end test
**Area:** Frontend | **Builds on:** cp-04-done | **Branch:** cp-05-url-screen | **Saves as:** cp-05-done | **Suggested:** Person A

**Goal.** The first complete vertical slice: a user submits a URL in the browser, sees the explained result, and can reopen the saved report.

**Tasks**
1. `features/url`: React Hook Form with the contract request schema, a URL field, helper text naming the accepted protocols, and three clickable examples that fill the field.
2. Submit with a TanStack mutation to `POST /api/scans/url`; show a progress state; render the result with the shared report components and an "Open saved report" link to `/reports/[scanId]`.
3. A details card from `details` (host, registrable domain, port, query parameter names).
4. Show the scanned URL as plain text only: never an anchor, never HTML.
5. Error states: field errors from 400, a rate-limit message for 429, retry for 5xx and timeouts; keep the typed input after any error.
6. Playwright setup: `npm run e2e` starts the backend through a test-only entry (`backend/tests/e2e-server.ts` using mongodb-memory-server) and the frontend, then runs the URL journeys.
7. Component tests for the form states (empty, invalid, loading, success, error).

**Allowed to change:** `frontend/**`, `e2e/**`, `backend/tests/e2e-server.ts`, root scripts, `docs/HANDOFF.md`.

**Must not change:** Any other backend file, other module screens, contract changes.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass.
- [ ] In the browser, U1 shows the IP-host, HTTPS and keyword findings with risk level Medium; U2 shows "No suspicious signals detected".
- [ ] The saved report link still works after a page refresh.
- [ ] No submitted string is rendered as a link or as HTML; no axe violations.

**Handoff note.** Record the e2e command and how the test server starts; next step is CP-06.

## CP-06 URL advanced detection and evaluation
**Area:** Backend | **Builds on:** cp-05-done | **Branch:** cp-06-url-advanced | **Saves as:** cp-06-done | **Suggested:** Person B

**Goal.** Add the high-value phishing signals (lookalikes, homographs, shorteners, brand misuse, local feed matches) and measure rule quality on real data.

**Tasks**
1. `npm run data:tranco -w backend` downloads the Tranco list and keeps the top 10,000 registrable domains in `backend/data/top-domains.txt` (commit it). Keep a 200-domain list for tests.
2. Advanced rules from Appendix B1: `URL_LOOKALIKE` (fastest-levenshtein), `URL_HOMOGRAPH` (punycode and mixed scripts via `domainToUnicode` and Unicode script checks), `URL_BRAND_SUBDOMAIN`, `URL_SHORTENER` (`data/shorteners.txt`).
3. `FeedEntry` model and a feed sync service for the OpenPhish community feed and URLhaus: parsing, size limits, timeouts. `npm run feeds:sync -w backend` for manual runs and a daily node-cron job enabled by `FEEDS_SYNC_ENABLED`. A sync failure is logged and never affects scans. Record each feed's licence in `docs/data-sources.md`.
4. `URL_FEED_MATCH` (exact URL or host in the local collection) forces `high`; update `limitations` to say reputation was checked against locally stored feeds and when they were last updated.
5. `npm run eval:url -w backend` scores a benign sample (`data/eval/benign.txt`: top domains with realistic paths) and a phishing sample (`data/eval/phishing.txt`, taken from the feeds) and prints detection and false-positive rates. Save the results in `docs/evaluation-url.md`. Tune weights until fewer than 5% of benign URLs reach `medium` or higher, and record the final numbers.
6. Bump `rulesVersion` to `url-1.1.0`. Tests for every new rule, feed matching against a seeded database, and sync failure handling with a mocked fetch.

**Allowed to change:** `backend/**`, `docs/**`.

**Must not change:** `frontend/**` (new finding types render automatically; log any rendering bug in the Parking lot), privacy and website code.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass; all CP-04 and CP-05 tests still pass.
- [ ] Golden inputs U5 to U8 produce the expected findings.
- [ ] A seeded feed entry produces `URL_FEED_MATCH` with risk level `high`.
- [ ] `docs/evaluation-url.md` exists with measured rates; the sync job fails safely with the network disabled.

**Handoff note.** Record the evaluation numbers, the data refresh commands and feed licence notes; next step is CP-07.

## CP-07 Privacy Analyzer engine and endpoint
**Area:** Backend | **Builds on:** cp-06-done | **Branch:** cp-07-privacy-engine | **Saves as:** cp-07-done | **Suggested:** Person A

**Goal.** A consent-based privacy engine that finds exposure patterns in supplied data, masks everything, and stores nothing sensitive.

**Tasks**
1. `modules/privacy/normalise.ts`: validate `PrivacyScanRequest`, parse profile URLs, build the normalised comparison form (lowercase, remove `.`, `_`, `-`), deduplicate, cap text length. Malformed profile URLs and oversize text return field errors.
2. `masking.ts`: `maskEmail`, `maskPhone`, `maskToken`, `maskCard` with unit tests.
3. `rules.ts`: all checks from Appendix B2. Use validator and libphonenumber-js `findPhoneNumbersInText`; use the Luhn algorithm for cards; token patterns as listed.
4. `service.ts`: build the report with a `pass` entry for every category checked, `riskLevel` as the highest severity, no score, `targetSummary` such as "2 profiles, text provided (1,204 characters)", and `limitations` (only supplied data analysed, no internet-wide account search, no profile page fetched, no breach lookup).
5. `POST /api/scans/privacy`: validate, run, store the masked report only, `expiresAt` 7 days.
6. Tests: golden inputs P1 to P4; a leak test that serialises the HTTP response, the stored database document and the captured log output and asserts that none contains the raw sample email, phone, token or card number; no `submittedText` field exists in the database.

**Allowed to change:** `backend/src/modules/privacy/**`, `backend/src/routes`, `backend/tests`, `docs/HANDOFF.md`.

**Must not change:** `frontend/**`, URL and website code.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass.
- [ ] Golden inputs P1 to P4 produce the expected codes; consent false returns 400.
- [ ] The leak test passes for response, database document and logs.
- [ ] Report wording never claims identity or internet-wide discovery.

**Handoff note.** Record the masking formats and the stored-data rule; next step is CP-08.

## CP-08 Privacy Analyzer screen
**Area:** Frontend | **Builds on:** cp-07-done | **Branch:** cp-08-privacy-screen | **Saves as:** cp-08-done | **Suggested:** Person B

**Goal.** A form that makes consent and scope unmistakable, and a result view that shows only masked evidence.

**Tasks**
1. `features/privacy`: profile rows with `useFieldArray` (platform, username, optional URL; add and remove; maximum 10), optional display name, a text area with a character counter (10,000), and a required consent checkbox.
2. A visible scope notice: only submitted material is analysed; do not enter passwords or government IDs; only enter data you may process. There is no password field anywhere.
3. Never write form input to browser storage (local, session or IndexedDB).
4. Submit to `POST /api/scans/privacy` and show results with the shared components, with the "What was not checked" panel (from `limitations`) prominent.
5. Error and retry states as in CP-05; the typed input is kept after errors.
6. Tests: consent blocks submission; a DOM test proves the raw sample email, phone and token never appear in the rendered result; storage is untouched; Playwright journey for P1 and P2 including reopening `/reports/<id>`.

**Allowed to change:** `frontend/**`, `e2e/**`, `docs/HANDOFF.md`.

**Must not change:** `backend/**`, other module screens, contract changes.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass.
- [ ] Submission is impossible without consent; no password input exists on the page.
- [ ] P1 in the browser shows masked values only; P2 shows `none_detected`.
- [ ] The saved report reopens after a refresh; no axe violations.

**Handoff note.** Record the form limits and the test commands; next step is CP-09.

## CP-09 Website Auditor engine, SSRF guard and endpoint
**Area:** Backend | **Builds on:** cp-08-done | **Branch:** cp-09-website-engine | **Saves as:** cp-09-done | **Suggested:** Person A

**Goal.** A safe website auditor: first a tested SSRF guard, then the TLS, header, cookie and DNS checks, then the endpoint with partial-result support. This is the largest checkpoint; it has four sub-savepoints.

**Tasks**
1. **9a SSRF guard** (`ssrf-guard.ts`): accept only http and https on ports 80 and 443, reject userinfo. A custom DNS `lookup` resolves A and AAAA, converts IPv4-mapped IPv6, and accepts a destination only when ipaddr.js classifies it as `unicast` (so loopback, private, link-local, multicast, unspecified, reserved, NAT64, 6to4 and CGNAT are rejected); reject if any answer is disallowed. Use an undici Agent with that lookup so the validated address is the one connected to. Redirects are followed manually (maximum 3) with the same checks per hop. Connect timeout 5 s, total timeout 10 s per request, response read capped at 256 KB, no forwarded credentials, global concurrency 3 via p-limit. Dependencies (resolver, address policy) are injected; tests inject a permissive policy for local fake servers and a test proves the default policy is strict.
2. **9a tests** (SSRF suite): `127.0.0.1`, `10/8`, `172.16/12`, `192.168/16`, `169.254.169.254`, `::1`, `::ffff:127.0.0.1`, decimal and hex IP forms, `localhost`, a resolver that returns a public then a private address, redirects to private hosts, ports 22 and 8080, `file:`, `ftp:` and `data:`. Tag `cp-09a-done`.
3. **9b DNS and TLS**: `SITE_DNS_RESOLVES`, `SITE_HTTPS_AVAILABLE`, `SITE_TLS_CERT_VALID`, `SITE_TLS_EXPIRY`, `SITE_TLS_PROTOCOL`, `SITE_HTTP_TO_HTTPS`, `SITE_REDIRECTS`. Open TLS with `tls.connect` using the guarded lookup, `servername` set and `rejectUnauthorized: false` only to read the certificate and the exact `authorizationError`. Record subject, issuer, validity dates, protocol, days remaining. Tests use a local TLS server with certificates from the `selfsigned` package (expired, wrong host, valid). Tag `cp-09b-done`.
4. **9c Headers, cookies, email DNS**: bounded verified HTTPS request (HEAD, falling back to GET with the 256 KB cap) for HSTS, CSP, X-Content-Type-Options, framing, Referrer-Policy, Permissions-Policy and version disclosure; handle missing, malformed and conflicting headers. Cookies via set-cookie-parser, names and attributes only. `SITE_SPF`, `SITE_DMARC`, `SITE_CAA` through `node:dns/promises`. Tests with local fake servers. Tag `cp-09c-done`.
5. **9d Assessment and endpoint**: run checks with `Promise.allSettled`, each with an 8-second timeout and a 25-second overall budget; a failed check becomes `not_assessed` with a reason, and dependent checks follow. Build the report (`partial` when any check was not assessed), `details` with a certificate summary (subject, issuer, validFrom, validTo, protocol, daysRemaining), final URL and redirect count, and `limitations` (not a penetration test, a single request was inspected, pages behind login and other routes not assessed). `POST /api/scans/website` requires `authorised:true`; blocked targets return 422 `TARGET_BLOCKED`; store no cookie values and no response bodies. Contract tests for all outcomes.

**Allowed to change:** `backend/src/modules/website/**`, `backend/src/routes`, `backend/tests`, `docs/HANDOFF.md`.

**Must not change:** `frontend/**`, URL and privacy code, any environment flag that weakens the guard.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass.
- [ ] The full SSRF suite passes; golden inputs W1 and W2 are rejected with the right codes and no outbound request is made.
- [ ] A fake server that times out yields a `partial` report with `not_assessed` findings, not an error.
- [ ] The stored database document has no cookie values and no response body.
- [ ] (Manual, online) golden input W3 returns `completed` or `partial` with all four groups.
- [ ] Sub-savepoints `cp-09a-done` to `cp-09d-done` exist; the final tag is `cp-09-done`.

**Handoff note.** Record the injection points for tests, the timeout values and the manual online test steps; next step is CP-10.

## CP-10 Website Auditor screen
**Area:** Frontend | **Builds on:** cp-09-done | **Branch:** cp-10-website-screen | **Saves as:** cp-10-done | **Suggested:** Person B

**Goal.** A form that prevents accidental use and a result view that separates pass, warn, fail and not assessed across four check groups.

**Tasks**
1. `features/website`: URL field, a required authorisation checkbox ("I own this site or have permission to assess it"), and a plain description of what is and is not tested (no exploits, no attack payloads).
2. Progress state that says a scan can take up to 25 seconds.
3. Results grouped as Connection and TLS, HTTP headers, Cookies, DNS and email, using the shared components; a certificate summary card from `details`; a partial-result banner naming the checks that could not complete.
4. Friendly handling of `TARGET_BLOCKED` ("This address cannot be audited because it is not a public website") without echoing internal details.
5. Tests: authorisation required; partial fixture shows `not_assessed` separately from `pass`; an unreachable target is never displayed as a pass; Playwright journeys for W1 (blocked) and a mocked-backend partial result. A manual online journey for W3 is documented.

**Allowed to change:** `frontend/**`, `e2e/**`, `docs/HANDOFF.md`.

**Must not change:** `backend/**`, other module screens, contract changes.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass.
- [ ] The form cannot be submitted without authorisation.
- [ ] W1 shows the blocked message; the partial fixture shows grouped results with a banner.
- [ ] The manual online check of W3 renders all four groups; no axe violations.

**Handoff note.** Record how the partial and blocked states are tested; next step is CP-11.

## CP-11 History, report actions and dashboard
**Area:** Full-stack | **Builds on:** cp-10-done | **Branch:** cp-11-history-dashboard | **Saves as:** cp-11-done | **Suggested:** Person A

**Goal.** Turn the three tools into one platform: a filterable history, report actions, and a dashboard built from real stored data.

**Tasks**
1. Backend: `GET /api/scans` with `module`, `status`, `from`, `to`, `page`, `limit` (max 50), newest first, owner-scoped, returning `HistoryPage`.
2. Backend: `GET /api/dashboard/summary` using a `$facet` aggregation returning `DashboardSummary` (total, by module, by risk level, 5 most recent). Tests with a seeded dataset and two owners.
3. Frontend `/history`: table with module and status filters and pagination kept in URL search parameters, row opens the report, empty state. Never shows raw privacy input.
4. Frontend report actions: delete with a confirmation dialog (returns to history), copy as Markdown, copy as JSON, and a print stylesheet that includes limitations.
5. Frontend dashboard at `/`: stat cards, a Recharts donut for risk level, bars per module, a recent-scans table, a first-use empty state, an error state, and short text explaining each count.
6. A notice on history and report pages: reports belong to this browser and expire after 7 days (privacy) or 30 days (others).
7. Tests and Playwright: counts match a seeded dataset; a new scan updates the dashboard; delete removes the row and the count; a second browser profile sees nothing.

**Allowed to change:** `backend/src/routes`, `backend/src/services`, `backend/tests`, `frontend/**`, `e2e/**`, `docs/HANDOFF.md`.

**Must not change:** Engines, finding codes, contract changes beyond logged bug fixes.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass.
- [ ] History filters and pagination work and survive a refresh; the dashboard has no hardcoded numbers.
- [ ] Deleting a report removes it from history and from the dashboard counts.
- [ ] Another owner cannot see or delete your reports (tested at API and browser level).
- [ ] The printed report matches the on-screen report and includes limitations.

**Handoff note.** Record the aggregation shape and the retention notice wording; next step is CP-12.

## CP-12 Hardening, deployment and documentation
**Area:** Full-stack | **Builds on:** cp-11-done | **Branch:** cp-12-harden-ship | **Saves as:** cp-12-done | **Suggested:** Person B

**Goal.** A reviewed, deployed and documented v1.0.0 that a new developer can set up from the README and that passes every golden journey on the live site.

**Tasks**
1. Security and abuse pass: rate-limit, payload-limit and CORS tests; cookie flags in production mode; scan the logs from a full e2e run for cookies, tokens and raw sample data; re-run the SSRF suite; `npm audit --omit=dev`; gitleaks over the history; fix or document every high finding.
2. Accessibility and polish: keyboard and screen-reader pass on every page, consistent risk wording, a Help page ("How to use Threatory": scope, limitations, what is stored and for how long), 404 and error pages, metadata and favicon.
3. Production config: backend multi-stage Dockerfile (non-root user, health check, graceful shutdown), documented env variables, MongoDB Atlas free cluster, backend on Render or any Docker host, frontend on Vercel, Netlify or Cloudflare Pages with `API_ORIGIN`. HTTPS everywhere.
4. Run all golden journeys on the live site from a clean browser profile; fix anything that fails.
5. Documentation: README (prerequisites, setup, env, commands, API routes, limitations, deployment), `docs/architecture.md`, `docs/security-notes.md`, and a demo script based on the golden inputs.
6. Final HANDOFF cleanup: resolve or list every Known issue; tag `v1.0.0`.

**Allowed to change:** Whole repository (fixes, config, docs).

**Must not change:** New features, new dependencies without need, contract changes beyond logged bug fixes.

**Exit gate**
- [ ] `npm run verify` and `npm run e2e` pass; `npm audit --omit=dev` has no unaddressed high or critical issues; gitleaks is clean.
- [ ] The live site passes golden journeys U1, U2, P1, P2 and W1, and W3 manually.
- [ ] The other person sets up the project from the README alone on a clean machine.
- [ ] Tags `cp-12-done` and `v1.0.0` exist; HANDOFF shows all checkpoints complete.

**Handoff note.** List the live URLs, secret rotation steps and remaining Known issues; next step is "maintenance".
