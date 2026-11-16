import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { User, IUser } from "../models/user.js";
import { Session } from "../models/session.js";
import { Scan } from "../models/scan.js";
import type { UserSafe } from "@threatory/contracts";

// Fixed pre-computed Argon2id hash for timing attack mitigation on non-existent users
export const DUMMY_ARGON2_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$otcjT2ZYQBsVgmlUvfqH9A$HUDOyNF23iL697blr7Pe/uu2udLkszwjnRGqE1+zfmo";

export const SESSION_COOKIE_NAME = "sid";
export const SESSION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function toSafeUser(user: IUser): UserSafe {
  return {
    id: user.userId,
    email: user.email,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : new Date(user.createdAt).toISOString(),
    lastLoginAt: user.lastLoginAt
      ? user.lastLoginAt instanceof Date
        ? user.lastLoginAt.toISOString()
        : new Date(user.lastLoginAt).toISOString()
      : null,
  };
}

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return hash(password);
  },

  async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  },

  async dummyVerify(password: string): Promise<void> {
    try {
      await verify(DUMMY_ARGON2_HASH, password);
    } catch {
      // Ignore timing dummy verification error
    }
  },

  async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

    await Session.create({
      tokenHash,
      userId,
      expiresAt,
    });

    return { token: rawToken, expiresAt };
  },

  async findUserBySessionToken(token: string): Promise<IUser | null> {
    if (!token || typeof token !== "string" || token.length !== 64) {
      return null;
    }

    const tokenHash = hashToken(token);
    const session = await Session.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    }).exec();

    if (!session) {
      return null;
    }

    return User.findOne({ userId: session.userId }).exec();
  },

  async invalidateSession(token: string): Promise<void> {
    if (!token || typeof token !== "string") {
      return;
    }
    const tokenHash = hashToken(token);
    await Session.deleteOne({ tokenHash }).exec();
  },

  async deleteAccount(userId: string): Promise<void> {
    await Promise.all([
      User.deleteOne({ userId }).exec(),
      Session.deleteMany({ userId }).exec(),
      Scan.deleteMany({ ownerId: userId }).exec(),
    ]);
  },
};
