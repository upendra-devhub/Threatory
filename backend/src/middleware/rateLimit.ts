import { Request, Response } from "express";
import rateLimit from "express-rate-limit";

function rateLimitHandler(
  _req: Request,
  res: Response,
  _next: unknown,
  options: { statusCode: number; message: string }
): void {
  res.status(options.statusCode).json({
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: options.message || "Too many requests, please try again later.",
    },
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
  handler: rateLimitHandler,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

export const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many scan requests, please try again later.",
  handler: rateLimitHandler,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});
