import crypto from "node:crypto";
import { Router, Request, Response, NextFunction } from "express";
import { SignUpRequest, SignInRequest } from "@threatory/contracts";
import { AppError, validateWithZod } from "../middleware/errors.js";
import { getEnv } from "../config/env.js";
import { User } from "../models/user.js";
import {
  authService,
  toSafeUser,
  SESSION_COOKIE_NAME,
} from "../services/authService.js";
import {
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
} from "../middleware/auth.js";
import { signUpLimiter, signInLimiter } from "../middleware/rateLimit.js";

export const authRouter = Router();

// POST /api/auth/signup
authRouter.post(
  "/signup",
  signUpLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const env = getEnv();
      const body = validateWithZod(SignUpRequest, req.body);
      const email = body.email.trim().toLowerCase();

      const existingUser = await User.findOne({ email }).exec();
      if (existingUser) {
        throw new AppError("CONFLICT", "An account with this email already exists");
      }

      const passwordHash = await authService.hashPassword(body.password);
      const userId = crypto.randomUUID();

      const user = await User.create({
        userId,
        email,
        passwordHash,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      });

      const { token } = await authService.createSession(userId);
      setSessionCookie(res, token, env);

      res.status(201).json({
        success: true,
        data: {
          user: toSafeUser(user),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/signin
authRouter.post(
  "/signin",
  signInLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const env = getEnv();
      const body = validateWithZod(SignInRequest, req.body);
      const email = body.email.trim().toLowerCase();

      const user = await User.findOne({ email }).exec();
      if (!user) {
        // Run dummy verification to mitigate timing-based account enumeration
        await authService.dummyVerify(body.password);
        throw new AppError("UNAUTHORIZED", "Invalid email or password");
      }

      const isValid = await authService.verifyPassword(user.passwordHash, body.password);
      if (!isValid) {
        throw new AppError("UNAUTHORIZED", "Invalid email or password");
      }

      user.lastLoginAt = new Date();
      await user.save();

      const { token } = await authService.createSession(user.userId);
      setSessionCookie(res, token, env);

      res.status(200).json({
        success: true,
        data: {
          user: toSafeUser(user),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/signout
authRouter.post(
  "/signout",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const env = getEnv();
      const token = req.cookies?.[SESSION_COOKIE_NAME];
      if (typeof token === "string" && token.length > 0) {
        await authService.invalidateSession(token);
      }
      clearSessionCookie(res, env);

      res.status(200).json({
        success: true,
        data: {
          signedOut: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/me
authRouter.get(
  "/me",
  requireAuth,
  (req: Request, res: Response): void => {
    // req.user is guaranteed by requireAuth
    res.status(200).json({
      success: true,
      data: {
        user: toSafeUser(req.user!),
      },
    });
  }
);

// DELETE /api/auth/me
authRouter.delete(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const env = getEnv();
      const userId = req.user!.userId;

      await authService.deleteAccount(userId);
      clearSessionCookie(res, env);

      res.status(200).json({
        success: true,
        data: {
          deleted: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
