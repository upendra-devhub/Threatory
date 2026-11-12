# HANDOFF

## Baton
Current owner: Person B            Updated: 2026-11-12
Status: IN PROGRESS
Last completed: CP-03 (tag `cp-03-done`)
Current checkpoint: CP-04 (worked directly on main by team decision)
Current branch: `main`

## Exact next step
CP-05: Build and wire the URL Analyzer frontend input form and scan submission view in Next.js, integrating with `POST /api/scans/url` and rendering the resulting reports via the shared report foundation.

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
Node version: 22 (per `.nvmrc`; verified locally on Node `v22.23.4` via `fnm`)
Workspaces: `packages/contracts` (`@threatory/contracts`), `backend`, `frontend`, `e2e`
Install: `npm ci`
Verify: `npm run verify` (root script now builds `@threatory/contracts` prior to lint, typecheck, test, and build)
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

## Checkpoint log
| CP | Owner | Finished | Tag | Notes |
|---|---|---|---|---|
| CP-01 | Person A | 2026-11-11 | `cp-01-done` | Monorepo workspaces, contracts, fixtures, golden-inputs, Vitest tests, GitHub Actions CI |
| CP-02 | Person B | 2026-11-11 | `cp-02-done` (applied retroactively) | Express API, Mongoose connection, Scan model with TTL/indexes, anonymous owner cookie + `DEV_OWNER_ID`, scan repository & routes (`GET`/`DELETE`), `docker-compose.yml`, seed script, Vitest/Supertest/MongoMemoryServer suites |
| CP-03 | Person A | 2026-11-11 | `cp-03-done` | Next.js 15 App Router shell, light design system, `/api/:path*` rewrite, typed Zod-validated API client, TanStack Query provider, shared report components, `/reports/[scanId]` saved-report page, `ApiStatusIndicator`, Vitest/RTL/`vitest-axe` tests |
| CP-04 | Person A | 2026-11-12 | `cp-04-done` (human to apply) | URL normaliser (`WHATWG URL` + `tldts`), 11 core detection rules (`url-1.0.0`), weighted scoring engine, `POST /api/scans/url` endpoint with 30-day TTL persistence, zero-network isolation tests, golden inputs U1 to U4 |

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

## Contract changes
None. Schemas implemented strictly per Appendix A and Appendix C; no changes to `packages/contracts` were required.

## Dependencies added
### Root / Workspace dependencies (CP-01)
- `zod` (^3.23.8, MIT): Runtime schema declaration and validation library.
- `typescript` (^5.6.3, Apache-2.0): Static typing for all workspaces.
- `vitest` (^2.1.4, MIT): Fast unit and contract test runner.
- `eslint` (^9.14.0, MIT) & `typescript-eslint` (^8.14.0, MIT): Linter for strict TypeScript.
- `prettier` (^3.3.3, MIT): Opinionated code formatting.
- `@types/node` (^22.9.0, MIT): Node.js type definitions.

### Backend dependencies (CP-02 & CP-04)
- `express` (^4.21.1, MIT), `helmet` (^8.0.0, MIT), `cors` (^2.8.5, MIT), `express-rate-limit` (^7.4.1, MIT), `pino` (^9.5.0, MIT), `pino-http` (^10.3.0, MIT), `cookie-parser` (^1.4.7, MIT), `mongoose` (^8.8.1, MIT), `dotenv` (^16.4.5, BSD-2-Clause), `zod` (^3.23.8, MIT), `supertest` (^7.0.0, MIT), `mongodb-memory-server` (^10.1.2, MIT), and `@types/*` (`MIT`).
- `tldts` (^6.1.86, MIT): Added in CP-04 to accurately extract registrable domains, ICANN public suffixes, and identify IP hosts for the URL analyzer engine without external network dependencies.

### Frontend dependencies (CP-03)
- `next` (`15.5.29`, MIT): Next.js App Router framework and `/api` rewrite proxy.
- `react` & `react-dom` (`19.3.1`, MIT) + `@types/react` & `@types/react-dom` (`19.3.0`, MIT): UI runtime and strict TypeScript definitions.
- `@tanstack/react-query` (`5.107.1`, MIT): Async report fetching, caching, cancellation, retry, and health polling.
- `lucide-react` (`0.468.0`, ISC): Accessible UI icons.
- `zod` (`3.25.76`, MIT): Client-side contract parsing with `@threatory/contracts`.
- `tailwindcss` (`3.4.19`, MIT), `postcss` (`8.5.32`, MIT), `autoprefixer` (`10.6.2`, MIT): Utility-first light theme styling.
- `@radix-ui/react-slot` (`1.5.0`, MIT), `class-variance-authority` (`0.7.1`, Apache-2.0), `clsx` (`2.1.1`, MIT), `tailwind-merge` (`2.6.1`, MIT): `shadcn/ui` component composition utilities.
- `@vitejs/plugin-react` (`4.7.0`, MIT), `jsdom` (`25.0.1`, MIT), `@testing-library/react` (`16.3.3`, MIT), `@testing-library/jest-dom` (`6.9.1`, MIT), `@testing-library/user-event` (`14.6.9`, MIT), `vitest-axe` (`0.1.0`, MIT): Automated DOM, interaction, and accessibility test tooling.

## Known issues
1. `npm audit` reports vulnerabilities and `eslint@9.39.5` is flagged deprecated; not addressed in CP-02/CP-03/CP-04. Do not run `npm audit fix --force`.
2. CI was red from CP-02 Task 1 to cp-03-done because @threatory/contracts was not built before typecheck on a fresh clone. Fixed in the commit 'fix: build contracts before verify so fresh clones pass CI' (verify builds contracts first, plus a root postinstall). The commits behind cp-02-done and cp-03-done were verified red on fresh clones at the time.
3. `cp-02-done` tag does not yet exist on `main` (`9714e16`).
4. `next build` warns that `@next/eslint-plugin-next` is not configured in root `eslint.config.mjs` (deferred to avoid modifying root config outside CP-03/CP-04 scope).
5. On Windows terminal environments, running backend tests in Standard Sandbox mode (without bypass) encounters `EACCES` on loopback `127.0.0.1` sockets (used by Supertest/Express and MongoMemoryServer); running tests with elevated network permissions allows full socket binding.

## Parking lot
- URL Analyzer frontend form and submission interaction (`CP-05`).
- Advanced URL rules (lookalike, homograph, shortener, brand subdomain, feeds) (`CP-06`).
- Privacy Exposure Analyzer backend and frontend (`CP-07`, `CP-08`).
- Website Security Auditor backend and frontend (`CP-09`, `CP-10`).
- History pagination/filtering, report deletion UI, and dashboard summary with Recharts (`CP-11`).
- Playwright end-to-end browser tests (`CP-05` onward).
- CP-04 golden tests hardcode the U1 to U4 inputs (they match golden-inputs.json); consider loading the JSON directly.
