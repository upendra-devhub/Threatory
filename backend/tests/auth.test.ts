import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app.js";
import { User } from "../src/models/user.js";
import { Session } from "../src/models/session.js";
import { Scan } from "../src/models/scan.js";
import { scanRepository } from "../src/repositories/scanRepository.js";
import { hashToken } from "../src/services/authService.js";

function extractSidCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  if (!raw) {
    throw new Error("Missing set-cookie header");
  }
  const cookies = Array.isArray(raw) ? raw : [raw];
  const sid = cookies.find((c) => c.startsWith("sid="));
  if (!sid) {
    throw new Error("Missing sid cookie in set-cookie");
  }
  return sid;
}

function getRawTokenFromCookie(cookieStr: string): string {
  const match = cookieStr.match(/sid=([^;]+)/);
  if (!match || !match[1]) {
    throw new Error("Unable to extract raw token from sid cookie");
  }
  return match[1];
}

describe("Authentication & User Account System (CP-13)", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    process.env.DISABLE_RATE_LIMIT = "true";
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    await User.init();
    await Session.init();
    await Scan.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await Scan.deleteMany({});
  });

  describe("Sign Up (POST /api/auth/signup)", () => {
    it("successfully creates a new user, hashes password with Argon2id, and starts a session", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "Test.User@example.com", password: "securepassword123" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("test.user@example.com");
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.createdAt).toBeDefined();

      // Password and hash must NOT be returned
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check cookie
      const sidCookie = extractSidCookie(res);
      expect(sidCookie).toMatch(/HttpOnly/i);
      expect(sidCookie).toMatch(/SameSite=Lax/i);

      // Verify MongoDB persistence
      const dbUser = await User.findOne({ email: "test.user@example.com" }).exec();
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).toMatch(/^\$argon2id\$/);
      expect(dbUser?.passwordHash).not.toContain("securepassword123");

      // Verify session in MongoDB stores SHA-256 hash, not raw token
      const rawToken = getRawTokenFromCookie(sidCookie);
      const expectedHash = hashToken(rawToken);
      const dbSession = await Session.findOne({ tokenHash: expectedHash }).exec();
      expect(dbSession).not.toBeNull();
      expect(dbSession?.userId).toBe(dbUser?.userId);
    });

    it("rejects duplicate email with HTTP 409 CONFLICT", async () => {
      await request(app)
        .post("/api/auth/signup")
        .send({ email: "user@example.com", password: "validPassword123" });

      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "USER@example.com", password: "differentPassword123" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
      expect(res.body.error.message).toMatch(/already exists/i);
    });

    it("rejects invalid email with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "not-an-email", password: "validPassword123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects passwords shorter than 10 characters with HTTP 400", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "user@example.com", password: "short" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields?.[0]?.message).toMatch(/at least 10 characters/i);
    });
  });

  describe("Sign In (POST /api/auth/signin)", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/auth/signup")
        .send({ email: "existing@example.com", password: "correctPassword123" });
    });

    it("authenticates valid credentials, returns safe user representation, and sets sid cookie", async () => {
      const res = await request(app)
        .post("/api/auth/signin")
        .send({ email: "EXISTING@example.com", password: "correctPassword123" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("existing@example.com");
      expect(res.body.data.user.passwordHash).toBeUndefined();

      const sidCookie = extractSidCookie(res);
      expect(sidCookie).toBeDefined();
    });

    it("returns HTTP 401 with generic message for incorrect password", async () => {
      const res = await request(app)
        .post("/api/auth/signin")
        .send({ email: "existing@example.com", password: "wrongPassword123" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("returns HTTP 401 with identical generic message for unknown email (timing attack mitigation)", async () => {
      const res = await request(app)
        .post("/api/auth/signin")
        .send({ email: "unknown@example.com", password: "anyPassword123" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toBe("Invalid email or password");
    });
  });

  describe("Current User (GET /api/auth/me)", () => {
    it("returns authenticated user details when valid session cookie is provided", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send({ email: "me@example.com", password: "securepassword123" });
      const cookie = extractSidCookie(signupRes);

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe("me@example.com");
      expect(meRes.body.data.user.passwordHash).toBeUndefined();
    });

    it("returns HTTP 401 when no session cookie is sent", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns HTTP 401 when session has expired", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send({ email: "expired@example.com", password: "securepassword123" });
      const cookie = extractSidCookie(signupRes);
      const rawToken = getRawTokenFromCookie(cookie);

      // Expire session in database
      const tokenHash = hashToken(rawToken);
      await Session.updateOne(
        { tokenHash },
        { expiresAt: new Date(Date.now() - 1000) }
      ).exec();

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Sign Out (POST /api/auth/signout)", () => {
    it("invalidates the server-side session and clears the sid cookie", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send({ email: "signout@example.com", password: "securepassword123" });
      const cookie = extractSidCookie(signupRes);
      const rawToken = getRawTokenFromCookie(cookie);

      const signoutRes = await request(app)
        .post("/api/auth/signout")
        .set("Cookie", cookie);

      expect(signoutRes.status).toBe(200);
      expect(signoutRes.body.data.signedOut).toBe(true);

      // Verify session removed from MongoDB
      const tokenHash = hashToken(rawToken);
      const dbSession = await Session.findOne({ tokenHash }).exec();
      expect(dbSession).toBeNull();

      // Subsequent request with invalidated cookie must fail with 401
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);
      expect(meRes.status).toBe(401);
    });
  });

  describe("Account Deletion (DELETE /api/auth/me)", () => {
    it("deletes user, all sessions, and all reports belonging to the user without leaving orphans", async () => {
      const signupRes = await request(app)
        .post("/api/auth/signup")
        .send({ email: "delete-me@example.com", password: "securepassword123" });
      const cookie = extractSidCookie(signupRes);
      const userId = signupRes.body.data.user.id;

      // Create a scan for this user
      await scanRepository.create({
        scanId: "user-scan-123",
        ownerId: userId,
        module: "url",
        status: "completed",
        rulesVersion: "url-1.0.0",
        targetSummary: "https://example.com",
        assessment: { label: "None detected", riskLevel: "none_detected" },
        findings: [],
        limitations: [],
        createdAt: new Date(),
      });

      // Confirm scan exists
      expect(await Scan.countDocuments({ ownerId: userId })).toBe(1);

      // Delete account
      const delRes = await request(app)
        .delete("/api/auth/me")
        .set("Cookie", cookie);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.deleted).toBe(true);

      // Verify user, sessions, and scans are completely purged
      expect(await User.countDocuments({ userId })).toBe(0);
      expect(await Session.countDocuments({ userId })).toBe(0);
      expect(await Scan.countDocuments({ ownerId: userId })).toBe(0);

      // Subsequent me request returns 401
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);
      expect(meRes.status).toBe(401);
    });
  });

  describe("Authenticated Report Ownership Isolation", () => {
    it("enforces strict isolation between User A and User B reports", async () => {
      // User A
      const resA = await request(app)
        .post("/api/auth/signup")
        .send({ email: "usera@example.com", password: "passwordUserA123" });
      const cookieA = extractSidCookie(resA);
      const userAId = resA.body.data.user.id;

      // User B
      const resB = await request(app)
        .post("/api/auth/signup")
        .send({ email: "userb@example.com", password: "passwordUserB123" });
      const cookieB = extractSidCookie(resB);
      const userBId = resB.body.data.user.id;

      // User A creates a scan
      const scanA = await scanRepository.create({
        scanId: "scan-user-a-secret",
        ownerId: userAId,
        module: "url",
        status: "completed",
        rulesVersion: "url-1.0.0",
        targetSummary: "https://user-a-domain.org",
        assessment: { label: "High", riskLevel: "high" },
        findings: [],
        limitations: [],
        createdAt: new Date(),
      });

      // User A can view their scan
      const getResA = await request(app)
        .get(`/api/scans/${scanA.scanId}`)
        .set("Cookie", cookieA);
      expect(getResA.status).toBe(200);
      expect(getResA.body.data.scanId).toBe(scanA.scanId);

      // User B CANNOT view User A's scan (receives 404 NOT_FOUND without revealing scan exists)
      const getResB = await request(app)
        .get(`/api/scans/${scanA.scanId}`)
        .set("Cookie", cookieB);
      expect(getResB.status).toBe(404);
      expect(getResB.body.error.code).toBe("NOT_FOUND");

      // User B CANNOT delete User A's scan
      const delResB = await request(app)
        .delete(`/api/scans/${scanA.scanId}`)
        .set("Cookie", cookieB);
      expect(delResB.status).toBe(404);

      // Unauthenticated request receives 401 UNAUTHORIZED
      const unauthRes = await request(app).get(`/api/scans/${scanA.scanId}`);
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe("UNAUTHORIZED");

      // User B history does NOT show User A's scan
      const histResB = await request(app)
        .get("/api/scans")
        .set("Cookie", cookieB);
      expect(histResB.status).toBe(200);
      expect(histResB.body.data.items).toHaveLength(0);

      // User B dashboard does NOT count User A's scan
      const dashResB = await request(app)
        .get("/api/dashboard/summary")
        .set("Cookie", cookieB);
      expect(dashResB.status).toBe(200);
      expect(dashResB.body.data.totalScans).toBe(0);
    });
  });
});
