import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { getEnv } from "./config/env.js";
import { httpLogger } from "./middleware/logger.js";
import { generalLimiter, scanLimiter } from "./middleware/rateLimit.js";

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
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );

  // Rate limiting: general, stricter on /api/scans
  app.use(generalLimiter);
  app.use("/api/scans", scanLimiter);

  // JSON body limit 20 kb
  app.use(express.json({ limit: "20kb" }));

  return app;
}

export const app: Express = createApp();
export default app;
