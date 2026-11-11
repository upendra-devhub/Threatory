# Threatory

Threatory is a deterministic web security and privacy analyzer built with TypeScript across a modular npm workspaces monorepo.

## Monorepo Structure

- `packages/contracts/`: Shared Zod contracts, TypeScript types, report/error fixtures, and golden inputs.
- `backend/`: Node.js Express API service for URL analysis, privacy checks, and website auditing.
- `frontend/`: Next.js web application for initiating scans and exploring reports.
- `e2e/`: End-to-end integration test suites.
- `docs/`: Architecture specification, checkpoint plans, and handoff documentation.

## Prerequisites

- Node.js >= 22 (see `.nvmrc`)
- npm >= 10

## Quick Start

```bash
# Install dependencies across all workspaces
npm ci

# Run complete verification (lint, typecheck, test, build)
npm run verify
```
