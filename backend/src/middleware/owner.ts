import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { getEnv } from "../config/env.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ownerId?: string;
    }
  }
}

export function ownerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const env = getEnv();

  // In non-production, DEV_OWNER_ID overrides it
  if (env.NODE_ENV !== "production" && env.DEV_OWNER_ID) {
    req.ownerId = env.DEV_OWNER_ID;
    next();
    return;
  }

  const existingOwnerId = req.signedCookies?.tid;
  if (typeof existingOwnerId === "string" && existingOwnerId.length > 0) {
    req.ownerId = existingOwnerId;
  } else {
    const newOwnerId = crypto.randomUUID();
    res.cookie("tid", newOwnerId, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    req.ownerId = newOwnerId;
  }

  next();
}
