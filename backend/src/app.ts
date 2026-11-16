import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env.js";
import { httpLogger } from "./middleware/logger.js";
import { generalLimiter, scanLimiter } from "./middleware/rateLimit.js";
import { notFoundHandler, errorHandler } from "./middleware/errors.js";
import {
  sessionMiddleware,
  requireAuth,
  validateOrigin,
  enforceJsonBody,
} from "./middleware/auth.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { scansRouter } from "./routes/scans.js";
import { dashboardRouter } from "./routes/dashboard.js";

export function createApp(): Express {
  const env = getEnv();
  const app = express();

  // Configurable trust proxy
  if (env.TRUST_PROXY !== undefined) {
    if (env.TRUST_PROXY === "true" || env.TRUST_PROXY === "1") {
      app.set("trust proxy", true);
    } else if (env.TRUST_PROXY === "false" || env.TRUST_PROXY === "0") {
      app.set("trust proxy", false);
    } else if (!isNaN(Number(env.TRUST_PROXY))) {
      app.set("trust proxy", Number(env.TRUST_PROXY));
    } else {
      app.set("trust proxy", env.TRUST_PROXY);
    }
  }

  // Pino HTTP logger with redaction
  app.use(httpLogger);

  // Helmet security headers
  app.use(helmet());

  // CORS: exact FRONTEND_ORIGIN, credentials
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin || requestOrigin === env.FRONTEND_ORIGIN) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
  );

  // Rate limiting: general, stricter on /api/scans
  app.use(generalLimiter);
  app.use("/api/scans", scanLimiter);

  // State-changing origin validation
  app.use(validateOrigin);

  // JSON body limit 20 kb
  app.use(express.json({ limit: "20kb" }));

  // Enforce JSON content type on state-changing requests with body
  app.use(enforceJsonBody);

  // Cookie parser with secret
  app.use(cookieParser(env.COOKIE_SECRET));

  // Session identification middleware (populates req.user, req.userId, req.ownerId)
  app.use(sessionMiddleware);

  // Routes
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/scans", requireAuth, scansRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Central error handler
  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
export default app;
