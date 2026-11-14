import pino from "pino";
import { pinoHttp } from "pino-http";
import { getEnv } from "../config/env.js";

const env = getEnv();

const REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.headers['set-cookie']",
  "res.headers['set-cookie']",
  "req.body",
  "res.body",
  "req.cookies",
  "req.signedCookies",
  "*.password",
  "*.cookie",
  "*.authorization",
  "*.secret",
  "*.token",
  "*.submittedText",
  "*.tid",
  "*.email",
  "*.phone",
  "*.cardNumber",
];

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
});

export const httpLogger = pinoHttp({
  logger,
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
});
