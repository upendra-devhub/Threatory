# HANDOFF

## Baton
Current owner: Person B            Updated: 2026-11-11
Status: READY
Last completed: CP-03 (pending human gate and `cp-03-done` tag; built on `main` `9714e16` because `cp-02-done` was not yet tagged)
Current checkpoint: none, next is CP-04
Current branch: `cp-03-frontend-foundation` (latest code commit `82a013b` before this handoff update)

## Exact next step
Human to review `cp-03-frontend-foundation`, run the final visual/interactive browser exit gate checks (`npm run dev -w frontend`, open `http://localhost:3000/reports/scan-url-001`, verify mobile/desktop viewports and API status stop/restart recovery), merge `--ff-only` and apply tag `cp-03-done`, then branch `cp-04-url-engine` for **CP-04 — URL Analyzer Engine and Endpoint**.
The frontend foundation (`AppShell`, typed `/api` client, and shared report components) is ready to be reused by CP-04 and CP-05.

## How to run (keep accurate)
Node version: 22 (per `.nvmrc`; verified locally on Node `v22.23.4` via `fnm`)
Workspaces: `packages/contracts` (`@threatory/contracts`), `backend`, `frontend`, `e2e`
Install: `npm ci`
Verify: `npm run build -w packages/contracts && npm run verify` (note: on a fresh install `packages/contracts` must be built once before root `npm run verify` runs `backend` `typecheck`)
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

## Frontend components created (CP-03)
- **Layout & shell (`frontend/src/components/layout/`):**
  - `AppShell`: responsive sidebar + mobile/tablet top bar with Threatory branding, skip-to-content link, active semantic navigation (`aria-current="page"`), keyboard-accessible mobile menu (`Escape` closes and restores focus), and single `ApiStatusIndicator`.
  - `PageHeader`: reusable page title, optional description, and optional contextual actions.
  - `ApiStatusIndicator` / `ApiStatusBadge`: polls `GET /api/health` every 30s (`useApiHealth`) and renders `API: Checking`, `API: Connected`, or `API: Unavailable`.
  - `navigation.ts`: shared primary route registry (`/`, `/url-analyzer`, `/privacy-analyzer`, `/website-auditor`, `/history`, `/help`).
- **Report components (`frontend/src/components/reports/`):**
  - `OutcomeBadge`: renders `pass`, `warn`, `fail`, and visibly distinct dashed `not_assessed` with icons and screen-reader labels (never uses "Safe").
  - `SeverityBadge`: renders `info`, `low`, `medium`, and `high` with distinct icons, borders, and font weights readable in grayscale.
  - `FindingCard`: displays title, code, category, `OutcomeBadge`, `SeverityBadge`, separate plain-text Evidence block, Explanation block, and Recommendation callout when supplied.
  - `FindingGroup`: dynamically groups findings by `category` in order of appearance, preserves finding order, supports unseen categories, and renders `EmptyState` when empty.
  - `AssessmentHeader`: renders prominent `riskLevel` (`none_detected`, `low`, `medium`, `high`), assessment `label`, and rule-based `score` + `scoreMeaning` only when supplied (never on Privacy/Website reports, never implying probability or "Safe").
  - `LimitationsPanel`: always renders `What was not checked (Limitations)` with all items or a safe empty notice.
  - `PartialBanner`: renders warning banner when `report.status === "partial"`.
  - `EmptyState`: reusable empty state without claiming safety.
  - `ErrorState`: reusable error banner with optional `onRetry` action wired to TanStack Query `refetch`.
  - `ReportSkeleton`: matches report heading, assessment, finding groups/cards, and limitations layout.
  - `ReportView` & `SavedReportView`: full report renderer (`completed`, `partial`, `failed`), dedicated `NOT_FOUND` view, safe key-value `details` formatter (`format-details.ts`), and `useReportQuery` hook.
- **UI primitives & providers (`frontend/src/components/ui/`, `frontend/src/app/`):**
  - `Button`, `Badge`, `Card`, `Alert`, `Skeleton` (shadcn/ui conventions with Tailwind + `cn`).
  - `Providers`: stable `QueryClient` provider (`staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`).

## Viewing seeded saved reports
1. Start MongoDB (`docker compose up -d` or local `mongod` on `127.0.0.1:27017`).
2. Ensure `backend/.env` exists (copied from `backend/.env.example`, setting `DEV_OWNER_ID=dev-owner-local-test` for local dev).
3. Seed fixtures: `npm run seed -w backend`
   - Seeded IDs: `scan-url-001` (URL completed), `scan-url-002` (URL partial), `scan-url-003` (URL failed), `scan-priv-001` (Privacy completed), `scan-priv-002` (Privacy partial), `scan-priv-003` (Privacy failed), `scan-site-001` (Website completed), `scan-site-002` (Website partial), `scan-site-003` (Website failed).
4. Start backend: `npm start -w backend` (port `4000`).
5. Start frontend: `npm run dev -w frontend` (port `3000`).
6. Open `http://localhost:3000/reports/scan-url-001` (or any seeded ID above, or `http://localhost:3000/reports/unknown-id` for the dedicated not-found state) and confirm `GET /api/scans/<scanId>` renders the MongoDB document and `API: Connected` appears in the shell header.
7. Dev owner note: `DEV_OWNER_ID` in `backend/.env` fixes `req.ownerId` in non-production environments; production assigns a signed HttpOnly `tid` UUID cookie and refuses to start if `DEV_OWNER_ID` is set.

## Checkpoint log
| CP | Owner | Finished | Tag | Notes |
|---|---|---|---|---|
| CP-01 | Person A | 2026-11-11 | `cp-01-done` | Monorepo workspaces, contracts, fixtures, golden-inputs, Vitest tests, GitHub Actions CI |
| CP-02 | Person B | 2026-11-11 | `cp-02-done` (pending human tag) | Express API, Mongoose connection, Scan model with TTL/indexes, anonymous owner cookie + `DEV_OWNER_ID`, scan repository & routes (`GET`/`DELETE`), `docker-compose.yml`, seed script, Vitest/Supertest/MongoMemoryServer suites |
| CP-03 | Person A | 2026-11-11 | `cp-03-done` (pending human gate) | Next.js 15 App Router shell, light design system, `/api/:path*` rewrite, typed Zod-validated API client, TanStack Query provider, shared report components, `/reports/[scanId]` saved-report page, `ApiStatusIndicator`, Vitest/RTL/`vitest-axe` tests |

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

### Backend dependencies (CP-02)
- `express` (^4.21.1, MIT), `helmet` (^8.0.0, MIT), `cors` (^2.8.5, MIT), `express-rate-limit` (^7.4.1, MIT), `pino` (^9.5.0, MIT), `pino-http` (^10.3.0, MIT), `cookie-parser` (^1.4.7, MIT), `mongoose` (^8.8.1, MIT), `dotenv` (^16.4.5, BSD-2-Clause), `zod` (^3.23.8, MIT), `supertest` (^7.0.0, MIT), `mongodb-memory-server` (^10.1.2, MIT), and `@types/*` (`MIT`).

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
1. `npm audit` reports vulnerabilities and `eslint@9.39.5` is flagged deprecated; not addressed in CP-02/CP-03. Do not run `npm audit fix --force`.
2. On a fresh clone, running `npm run verify` without building `@threatory/contracts` first fails in `backend` `typecheck` because `packages/contracts/package.json` resolves types from `./dist/index.d.ts` while root `package.json` runs `typecheck` before `build` (workaround: run `npm run build -w packages/contracts` before `npm run verify`).
3. `cp-02-done` tag does not yet exist on `main` (`9714e16`).
4. `next build` warns that `@next/eslint-plugin-next` is not configured in root `eslint.config.mjs` (deferred to avoid modifying root config outside CP-03 scope).
5. Visual layout at 1440px/1024px/768px/390px and live browser stop/restart backend polling were verified via Tailwind layout structure, Next.js HTTP/SSR checks, and jsdom component tests rather than a live desktop browser session.

## Parking lot
- Analyzer input forms and submission workflows (`CP-04`, `CP-05`, `CP-07`, `CP-08`, `CP-09`, `CP-10`).
- History pagination/filtering, report deletion UI, and dashboard summary with Recharts (`CP-11`).
- Playwright end-to-end browser tests (`CP-05` onward).
- Optional `@next/eslint-plugin-next` addition to root ESLint config and `verify` script build ordering fix (`CP-12` or dedicated repo fix).
