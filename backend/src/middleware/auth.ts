import { Request, Response, NextFunction } from "express";
import { getEnv, Env } from "../config/env.js";
import { AppError } from "./errors.js";
import {
  authService,
  SESSION_COOKIE_NAME,
  SESSION_LIFETIME_MS,
} from "../services/authService.js";
import { IUser } from "../models/user.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      rawSessionToken?: string;
    }
  }
}

export function setSessionCookie(res: Response, token: string, env: Env): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_LIFETIME_MS,
  });
}

export function clearSessionCookie(res: Response, env: Env): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });
}

export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof rawToken === "string" && rawToken.length === 64) {
      const user = await authService.findUserBySessionToken(rawToken);
      if (user) {
        req.user = user;
        req.userId = user.userId;
        req.ownerId = user.userId;
        req.rawSessionToken = rawToken;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user || !req.userId) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  next();
}

export function validateOrigin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const env = getEnv();
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (origin && origin !== env.FRONTEND_ORIGIN) {
    throw new AppError("TARGET_BLOCKED", "Invalid request origin");
  }

  next();
}

export function enforceJsonBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (methodsWithBody.includes(req.method)) {
    const contentLength = req.headers["content-length"];
    if (contentLength && contentLength !== "0") {
      const contentType = req.headers["content-type"];
      if (!contentType || !contentType.toLowerCase().includes("application/json")) {
        throw new AppError("VALIDATION_ERROR", "Content-Type must be application/json");
      }
    }
  }
  next();
}
