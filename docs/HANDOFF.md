# HANDOFF

## Baton
Current owner: Person A            Updated: 2026-11-13
Status: READY
Last completed: CP-05 (pending human gate and `cp-05-done` tag)
Current checkpoint: CP-05 completed, next is CP-06
Current branch: `main`

## Exact next step
The next checkpoint is **CP-06 — URL Advanced Detection and Evaluation**.
- The URL Analyzer frontend is fully functional at `/url-analyzer`.
- The backend URL analysis endpoint (`POST /api/scans/url`) and persistence are fully integrated.
- The report rendering uses the shared CP-03 components (`AssessmentHeader`, `FindingGroup`, `FindingCard`, `LimitationsPanel`, `OutcomeBadge`, `SeverityBadge`).
- The Playwright E2E infrastructure is operational and repeatable (`npm run e2e`).
- Golden inputs U1 and U2 can be used for regression testing across the entire stack.
- CP-06 can extend the backend URL engine (`backend/src/modules/url/`) without requiring frontend redesign or structural changes.

## Rules Engine Reference (CP-04)
- **Rules Version:** `url-1.0.0`
- **Configuration File Location:** `backend/src/modules/url/rules.config.ts`
- **How to add a rule:**
  1. In `backend/src/modules/url/rules.config.ts`:
     - Add the finding code to `CoreRuleCode` (or the corresponding rules union).
     - Add the rule descriptor to `coreRuleConfigs` with stable UPPER_SNAKE `code`, `category` (e.g. `"host"`), `title`, numeric `weight`, `triggeredSeverity` (`"low"`, `"medium"`, or `"high"`), and `triggeredOutcome` (`"warn"` or `"fail"`).
     - If the rule relies on configurable thresholds or string lists, define them in `thresholds` or `lists`.
  2. In `backend/src/modules/url/rules.ts`:
     - Implement the checker function `checkRuleName(normalised: NormalisedUrl): FindingResult`.
     - When not triggered: return `outcome: "pass"`, `severity: "info"`, `weight: 0`, and `triggered: false`.
     - When triggered: return `outcome: "warn"` or `"fail"`, corresponding severity and weight, `evidence`, `explanation`, and mandatory `recommendation`.
     - Add the checker call into `runCoreRules(normalised)` in deterministic order.
  3. In `backend/tests/url-rules.test.ts`:
     - Add positive and negative test cases verifying triggering conditions, contract validation, and recommendation presence.

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

## API configuration
- Server-side environment variable: `API_ORIGIN` (documented in `frontend/.env.example`, default `http://localhost:4000`). Not exposed via `NEXT_PUBLIC_`.
- Next.js rewrite in `frontend/next.config.ts`: rewrites `/api/:path*` to `${API_ORIGIN}/api/:path*` (preserving path and query parameters so the signed HttpOnly `tid` cookie stays first-party).
- Browser API client (`frontend/src/lib/api-client.ts`): calls relative `/api/...` paths only with `credentials: "include"` and timeout abort handling, validates report envelopes against `ApiSuccess(Report)` and errors against `ApiError`, and validates `GET /api/health` against `{ status: "ok", timestamp }`.
- Endpoint `POST /api/scans/url`: validates request payload against `UrlScanRequest`, runs `analyseUrl` deterministic core rules engine, stores report with anonymous owner cookie / `DEV_OWNER_ID` with 30-day `expiresAt` TTL, and returns HTTP 201 with `{ success: true, data: report }`.
- Method `submitUrlScan(request: UrlScanRequest, options?: ApiRequestOptions)`: sends POST to relative `/api/scans/url`, validates input and response against shared contracts, throws typed `ApiClientError`, `ApiTimeoutError`, or `ApiNetworkError`.

## URL Analyzer Frontend Implementation (CP-05)
- **Feature directory:** `frontend/src/features/url/`
  - `components/URLScanForm.tsx`: React Hook Form with `zodResolver(UrlScanRequest)`, accessible label, helper text, input field with validation error display, explicit protocol notes (`http://`, `https://`), submit button with loading state, and integration with `URLExamples`.
  - `components/URLExamples.tsx`: Clickable buttons referencing golden-input samples (U1 suspicious IP host, U2 normal HTTPS URL, U3 embedded credentials) that populate the input field without auto-submitting.
  - `components/URLScanProgress.tsx`: Non-blocking progress indicator (`role="status"`, `aria-live="polite"`) announcing "Analyzing URL indicators..." and clarifying that URLs are analyzed purely as text without visiting remote websites.
  - `components/URLDetailsCard.tsx`: Structural metadata inspector rendering parsed Host, Registrable Domain, explicit/default Port, Scheme, Subdomain labels, and query parameter names. Strict data safety ensures query parameter values are never displayed and missing/unexpected types are safely formatted.
  - `components/URLScanResult.tsx`: Complete report result view presenting scanned target summary (strictly plain text), assessment header, technical URL details card, findings grouped by category, limitations panel, and prominent "Open saved report" action navigating to `/reports/[scanId]`.
  - `components/URLAnalyzerView.tsx`: Main feature view managing scan execution, progress display, error handling with retry action (`ErrorState`), and report rendering.
  - `hooks/useUrlScan.ts`: TanStack Query `useMutation` hook managing submission to `submitUrlScan`, error differentiation (validation field errors vs general rate limits/server failures/timeouts), and manual retry state.
- **Route:** `frontend/src/app/url-analyzer/page.tsx` renders `URLAnalyzerView`.

## End-to-End Testing Infrastructure (CP-05)
- **Command:** `npm run e2e`
- **Playwright configuration:** `playwright.config.ts` in root manages test execution and dual webServer lifecycle.
- **Test-only backend server:** `backend/tests/e2e-server.ts` starts an isolated `MongoMemoryServer` instance, connects Mongoose, starts Express on port `4001`, and cleanly shuts down HTTP and database connections on process exit (`SIGINT`/`SIGTERM`).
- **Frontend webServer:** Next.js dev server runs on port `3000` with `API_ORIGIN=http://127.0.0.1:4001`, routing `/api/*` requests to the test backend.
- **E2E Journeys (`e2e/src/url-analyzer.spec.ts`):**
  1. *Journey 1 (U1):* Submits `http://198.51.100.23/login`, verifies loading state, validates findings (`URL_IP_HOST` fail, `URL_NO_HTTPS` warn, `URL_KEYWORDS` warn), score 50, and risk level Medium.
  2. *Journey 2 (U2):* Submits `https://example.com/`, verifies all findings pass, score 0, and risk label is strictly "No suspicious signals detected" (never "Safe").
  3. *Journey 3 (Saved report):* Captures returned scan ID, clicks "Open saved report", verifies navigation to `/reports/[scanId]`, reloads page in same browser context, and verifies persistence with signed owner cookie.
  4. *Journey 4 (Unsupported protocol):* Submits `ftp://example.com`, verifies backend HTTP 400 validation error in `#url-error`, and verifies input remains preserved.
  5. *Journey 5 (Example buttons):* Verifies all 3 examples fill input without auto-submitting and input remains editable.
  6. *Journey 6 (Safe rendering):* Verifies scanned URL is not converted into external anchor tags or clickable links.

## Checkpoint log
| CP | Owner | Finished | Tag | Notes |
|---|---|---|---|---|
| CP-01 | Person A | 2026-11-11 | `cp-01-done` | Monorepo workspaces, contracts, fixtures, golden-inputs, Vitest tests, GitHub Actions CI |
| CP-02 | Person B | 2026-11-11 | `cp-02-done` (applied retroactively) | Express API, Mongoose connection, Scan model with TTL/indexes, anonymous owner cookie + `DEV_OWNER_ID`, scan repository & routes (`GET`/`DELETE`), `docker-compose.yml`, seed script, Vitest/Supertest/MongoMemoryServer suites |
| CP-03 | Person A | 2026-11-11 | `cp-03-done` | Next.js 15 App Router shell, light design system, `/api/:path*` rewrite, typed Zod-validated API client, TanStack Query provider, shared report components, `/reports/[scanId]` saved-report page, `ApiStatusIndicator`, Vitest/RTL/`vitest-axe` tests |
| CP-04 | Person A | 2026-11-12 | `cp-04-done` | URL normaliser (`WHATWG URL` + `tldts`), 11 core detection rules (`url-1.0.0`), weighted scoring engine, `POST /api/scans/url` endpoint with 30-day TTL persistence, zero-network isolation tests, golden inputs U1 to U4 |
| CP-05 | Person A | 2026-11-13 | `cp-05-done` (human to apply) | URL Analyzer screen (`/url-analyzer`), React Hook Form + `UrlScanRequest`, `useUrlScan` mutation hook, `URLDetailsCard`, strict plain-text URL rendering, `ErrorState` with retry, Playwright E2E infrastructure with in-memory MongoDB server, vitest-axe accessibility |

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
16. In `backend/src/modules/url/rules.ts`, all 11 core detection rules always emit a finding in fixed order; score is capped at 100 with risk level derived per Appendix B1 (0-14 none_detected, 15-39 low, 40-69 medium, 70-100 high). Every warn and fail finding contains evidence, explanation, and an actionable recommendation.
17. The brief says riskLevel is the highest severity found, but B1 and golden input U1 derive the URL level from score bands (U1 has a high-severity fail yet expects medium). CP-04 follows B1 and U1.
18. In CP-05, `submitUrlScan` was integrated directly into `frontend/src/lib/api-client.ts`, generalizing `performRelativeFetch` to support configurable HTTP method, payload, and headers while maintaining strict typed schema validation via `ApiSuccess(Report)` and `ApiError`.
19. E2E backend server (`backend/tests/e2e-server.ts`) runs on dedicated test port `4001` with an isolated `MongoMemoryServer` instance and test-only secrets, completely decoupled from any live developer database. `DEV_OWNER_ID` is omitted in E2E so real signed HttpOnly `tid` owner cookies are validated across navigations and reloads.
20. In `URLAnalyzerView`, `CardTitle` is rendered with `as="h2"` beneath `PageHeader`'s `h1` to guarantee proper heading hierarchy and 0 axe violations.
21. Strict plain-text URL rendering was implemented across all URL display components: the target URL is rendered in non-interactive code/text blocks with no external anchors, protecting against HTML injection and URL navigation.

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

### Backend dependencies (CP-02 & CP-04)
- `express` (^4.21.1, MIT), `helmet` (^8.0.0, MIT), `cors` (^2.8.5, MIT), `express-rate-limit` (^7.4.1, MIT), `pino` (^9.5.0, MIT), `pino-http` (^10.3.0, MIT), `cookie-parser` (^1.4.7, MIT), `mongoose` (^8.8.1, MIT), `dotenv` (^16.4.5, BSD-2-Clause), `zod` (^3.23.8, MIT), `supertest` (^7.0.0, MIT), `mongodb-memory-server` (^10.1.2, MIT), and `@types/*` (`MIT`).
- `tldts` (^6.1.86, MIT): Added in CP-04 to accurately extract registrable domains, ICANN public suffixes, and identify IP hosts for the URL analyzer engine without external network dependencies.

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
1. `npm audit` reports vulnerabilities and `eslint@9.39.5` is flagged deprecated; not addressed in CP-02/CP-03/CP-04/CP-05. Do not run `npm audit fix --force`.
2. `next build` warns that `@next/eslint-plugin-next` is not configured in root `eslint.config.mjs` (deferred to avoid modifying root config outside CP-03/CP-04/CP-05 scope).
3. On Windows terminal environments, running backend tests in Standard Sandbox mode (without bypass) encounters `EACCES` on loopback `127.0.0.1` sockets (used by Supertest/Express and MongoMemoryServer); running tests with elevated network permissions allows full socket binding.

## Parking lot
- Advanced URL rules (lookalike, homograph, shortener, brand subdomain, feeds) (`CP-06`).
- Privacy Exposure Analyzer backend and frontend (`CP-07`, `CP-08`).
- Website Security Auditor backend and frontend (`CP-09`, `CP-10`).
- History pagination/filtering, report deletion UI, and dashboard summary with Recharts (`CP-11`).
- Dark mode toggle or theme customizer.
