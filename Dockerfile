# ==============================================================================
# Threatory Backend Production Dockerfile (Multi-Stage)
# Context: Root monorepo directory (.)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root manifest and workspace package files
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY backend/package.json ./backend/

# Install all workspace dependencies for contracts and backend
RUN npm ci --workspace=@threatory/contracts --workspace=backend

# Copy source code and build configs
COPY packages/contracts/ ./packages/contracts/
COPY backend/ ./backend/

# Compile TypeScript packages
RUN npm run build -w @threatory/contracts
RUN npm run build -w backend

# Prune devDependencies to keep only production dependencies
RUN npm prune --omit=dev --workspace=@threatory/contracts --workspace=backend

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy workspace dependencies and built distribution packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/data ./backend/data

# Run as non-root user for security hardening
USER node

EXPOSE 4000

# Built-in lightweight health check inspecting GET /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.get('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1));"

CMD ["node", "backend/dist/server.js"]
