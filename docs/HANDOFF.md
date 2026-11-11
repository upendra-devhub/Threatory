# HANDOFF

## Baton
Current owner: Person A
Status: READY
Last completed: cp-02-done
Current checkpoint: none, next is CP-03

## Exact next step
Human to run Docker-dependent exit gate checks (`docker compose up -d`, `npm run seed -w backend`, verify `GET /api/health` and `GET /api/scans/:scanId`), tag `cp-02-done`, and branch `cp-03-url-core-rules` for CP-03.
- Seed command: `npm run seed -w backend` (connects to MongoDB and upserts the 9 contract report fixtures for the dev owner).
- Seeded scan IDs:
  - `scan-url-001` (URL completed)
  - `scan-url-002` (URL partial)
  - `scan-url-003` (URL failed)
  - `scan-priv-001` (Privacy completed)
  - `scan-priv-002` (Privacy partial)
  - `scan-priv-003` (Privacy failed)
  - `scan-site-001` (Website completed)
  - `scan-site-002` (Website partial)
  - `scan-site-003` (Website failed)
- Dev owner setup:
  `DEV_OWNER_ID` in `.env` (default placeholder `dev-owner-local-test`) fixes `req.ownerId` in non-production environments to allow testing and local fixture inspection. The application refuses to start if `DEV_OWNER_ID` is set when `NODE_ENV=production`. In production, random UUIDs are assigned and tracked via signed HttpOnly cookie `tid`.

## How to run (keep accurate)
Node version: 22 (per `.nvmrc`)
Workspaces: `packages/contracts` (`@threatory/contracts`), `backend`, `frontend`, `e2e`
Install: `npm ci` | Verify: `npm run verify`
Lint: `npm run lint` | Typecheck: `npm run typecheck` | Test: `npm run test` | Build: `npm run build`
Local database: `docker compose up -d`
Seed database: `npm run seed -w backend`
Start backend: `npm start -w backend`

## Checkpoint log
| CP | Owner | Finished | Tag | Notes |
|---|---|---|---|---|
| CP-01 | Person A | 2026-11-11 | cp-01-done | Monorepo workspaces, contracts, fixtures, golden-inputs, Vitest tests, GitHub Actions CI |
| CP-02 | Person B | 2026-11-11 | cp-02-done (pending human gate) | Express API, Mongoose connection, Scan model with TTL/indexes, anonymous owner cookie + DEV_OWNER_ID override, scan repository & routes (GET/DELETE), docker-compose MongoDB, seed script, Vitest/Supertest/MongoMemoryServer test suites |

## Decisions
1. main was created after CP-01 at the cp-01-done commit (c9a832c), because the pre-CP-01 setup step existed only in the PDF. History unchanged.
2. Used ESLint 9 flat config (`eslint.config.mjs`) with `typescript-eslint` v8 for type-aware linting across all monorepo workspaces.
3. In `packages/contracts`, used `superRefine` on `Finding` to enforce requirement that `recommendation` is required when `outcome` is `"warn"` or `"fail"` per Rule 46 and Appendix A.
4. Created `backend/tsconfig.build.json` emitting to `dist` so that `backend` builds cleanly with standard `tsc` and can be executed with `node dist/server.js` or `node dist/scripts/seed.js` without requiring external runtime loaders.
5. Configured configurable trust proxy handling in Express via `TRUST_PROXY` environment variable.
6. Implemented anonymous owner identification using Node.js `crypto.randomUUID()` set in signed HttpOnly cookie `tid` with SameSite Lax (Secure in production). `DEV_OWNER_ID` overrides `req.ownerId` in development/test.
7. Centralized `ApiError` format mapping with `AppError` and `formatZodError` ensuring error responses never return stack traces.

## Contract changes
None. Schemas implemented strictly per Appendix A and Appendix C.

## Dependencies added
### Root / Workspace dependencies (CP-01)
- `zod` (^3.23.8, MIT): Runtime schema declaration and validation library.
- `typescript` (^5.6.3, Apache-2.0): Static typing for all workspaces.
- `vitest` (^2.1.4, MIT): Fast unit and contract test runner.
- `eslint` (^9.14.0, MIT) & `typescript-eslint` (^8.14.0, MIT): Linter for strict TypeScript.
- `prettier` (^3.3.3, MIT): Opinionated code formatting.
- `@types/node` (^22.9.0, MIT): Node.js type definitions.

### Backend dependencies (CP-02)
- `express` (^4.21.1, MIT): Core HTTP web server framework.
- `helmet` (^8.0.0, MIT): HTTP security headers middleware.
- `cors` (^2.8.5, MIT): Cross-Origin Resource Sharing middleware restricting to `FRONTEND_ORIGIN` with credentials.
- `express-rate-limit` (^7.4.1, MIT): IP-based rate limiting middleware with stricter limit on scan endpoints.
- `pino` (^9.5.0, MIT): Fast, low-overhead structured logger with redaction support.
- `pino-http` (^10.3.0, MIT): Pino HTTP request logging middleware with header and body redaction.
- `cookie-parser` (^1.4.7, MIT): Signed cookie parser middleware for anonymous owner tracking.
- `mongoose` (^8.8.1, MIT): MongoDB object document modeling library.
- `dotenv` (^16.4.5, BSD-2-Clause): Environment variable loader from `.env` files.
- `zod` (^3.23.8, MIT): Schema validation for environment and requests.
- `@types/express` (^4.17.21, MIT): TypeScript definitions for Express.
- `@types/cors` (^2.8.17, MIT): TypeScript definitions for CORS.
- `@types/cookie-parser` (^1.4.7, MIT): TypeScript definitions for cookie-parser.
- `@types/pino-http` (^5.8.4, MIT): TypeScript definitions for pino-http.
- `@types/supertest` (^6.0.2, MIT): TypeScript definitions for Supertest.
- `supertest` (^7.0.0, MIT): HTTP assertions library for API route testing.
- `mongodb-memory-server` (^10.1.2, MIT): In-memory MongoDB server for isolated automated tests.

## Known issues
1. npm audit reports 14 vulnerabilities (10 moderate, 2 high, 2 critical) and eslint@9.39.5 is flagged deprecated; not addressed in CP-02. Do not run npm audit fix --force.

## Parking lot
None.
