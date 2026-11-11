import pino from "pino";
import { pinoHttp } from "pino-http";
import { getEnv } from "../config/env.js";

const env = getEnv();

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.body",
      "res.headers[\"set-cookie\"]",
    ],
    censor: "[REDACTED]",
  },
});

export const httpLogger = pinoHttp({
  logger,
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.body",
      "res.headers[\"set-cookie\"]",
    ],
    censor: "[REDACTED]",
  },
});
