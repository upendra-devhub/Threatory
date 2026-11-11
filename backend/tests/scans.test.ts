import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app.js";
import { Scan } from "../src/models/scan.js";
import { scanRepository } from "../src/repositories/scanRepository.js";
import { runSeed } from "../src/scripts/seed.js";

describe("Scans, Ownership Isolation, and TTL Index", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    await Scan.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Scan.deleteMany({});
  });

  it("verifies TTL index on expiresAt and compound indexes exist", async () => {
    const rawIndexes = await Scan.collection.indexes();
    const indexNames = rawIndexes.map((idx) => idx.name);

    expect(indexNames).toContain("expiresAt_1");
    expect(indexNames).toContain("ownerId_1_createdAt_-1");
    expect(indexNames).toContain("ownerId_1_module_1_createdAt_-1");

    const ttlIndex = rawIndexes.find((idx) => idx.name === "expiresAt_1");
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex?.expireAfterSeconds).toBe(0);
  });

  describe("Repository Level Isolation", () => {
    it("two owners cannot read or delete each other's scans", async () => {
      const ownerA = "owner-alice-123";
      const ownerB = "owner-bob-456";

      const created = await scanRepository.create({
        scanId: "scan-iso-001",
        ownerId: ownerA,
        module: "url",
        status: "completed",
        rulesVersion: "url-1.0.0",
        targetSummary: "https://example.com",
        assessment: {
          label: "None detected",
          riskLevel: "none_detected",
          score: 0,
        },
        findings: [],
        limitations: ["None"],
      });

      expect(created.scanId).toBe("scan-iso-001");

      const foundA = await scanRepository.getById("scan-iso-001", ownerA);
      expect(foundA).not.toBeNull();
      expect(foundA?.scanId).toBe("scan-iso-001");

      const foundB = await scanRepository.getById("scan-iso-001", ownerB);
      expect(foundB).toBeNull();

      const deletedByB = await scanRepository.delete("scan-iso-001", ownerB);
      expect(deletedByB).toBe(false);

      const stillThere = await scanRepository.getById("scan-iso-001", ownerA);
      expect(stillThere).not.toBeNull();

      const deletedByA = await scanRepository.delete("scan-iso-001", ownerA);
      expect(deletedByA).toBe(true);

      const gone = await scanRepository.getById("scan-iso-001", ownerA);
      expect(gone).toBeNull();
    });
  });

  describe("HTTP Route Level Isolation", () => {
    it("two clients with different cookie identities cannot read or delete each other's scans", async () => {
      const originalDevOwner = process.env.DEV_OWNER_ID;
      delete process.env.DEV_OWNER_ID;

      try {
        const resA = await request(app).get("/api/health");
        const rawCookieA = resA.headers["set-cookie"];
        expect(rawCookieA).toBeDefined();
        const cookieA: string[] = Array.isArray(rawCookieA)
          ? rawCookieA
          : [rawCookieA ?? ""];

        const resB = await request(app).get("/api/health");
        const rawCookieB = resB.headers["set-cookie"];
        expect(rawCookieB).toBeDefined();
        const cookieB: string[] = Array.isArray(rawCookieB)
          ? rawCookieB
          : [rawCookieB ?? ""];

        expect(cookieA).not.toEqual(cookieB);

        let clientAOwnerId = "";
        const cookieStr = cookieA[0] || "";
        const match = cookieStr.match(/tid=s%3A([^.;]+)/);
        if (match && match[1]) {
          clientAOwnerId = decodeURIComponent(match[1]);
        }

        expect(clientAOwnerId).toBeTruthy();

        await scanRepository.create({
          scanId: "http-scan-001",
          ownerId: clientAOwnerId,
          module: "url",
          status: "completed",
          rulesVersion: "url-1.0.0",
          targetSummary: "https://example.com/client-a",
          assessment: {
            label: "Low",
            riskLevel: "low",
            score: 10,
          },
          findings: [],
          limitations: ["No limitations"],
        });

        const readA = await request(app)
          .get("/api/scans/http-scan-001")
          .set("Cookie", cookieA);
        expect(readA.status).toBe(200);
        expect(readA.body.success).toBe(true);
        expect(readA.body.data.scanId).toBe("http-scan-001");

        const readB = await request(app)
          .get("/api/scans/http-scan-001")
          .set("Cookie", cookieB);
        expect(readB.status).toBe(404);
        expect(readB.body.success).toBe(false);
        expect(readB.body.error.code).toBe("NOT_FOUND");

        const delB = await request(app)
          .delete("/api/scans/http-scan-001")
          .set("Cookie", cookieB);
        expect(delB.status).toBe(404);
        expect(delB.body.success).toBe(false);
        expect(delB.body.error.code).toBe("NOT_FOUND");

        const verifyA = await request(app)
          .get("/api/scans/http-scan-001")
          .set("Cookie", cookieA);
        expect(verifyA.status).toBe(200);

        const delA = await request(app)
          .delete("/api/scans/http-scan-001")
          .set("Cookie", cookieA);
        expect(delA.status).toBe(200);
        expect(delA.body.data.deleted).toBe(true);

        const verifyDeleted = await request(app)
          .get("/api/scans/http-scan-001")
          .set("Cookie", cookieA);
        expect(verifyDeleted.status).toBe(404);
      } finally {
        if (originalDevOwner !== undefined) {
          process.env.DEV_OWNER_ID = originalDevOwner;
        }
      }
    });
  });

  describe("Seed Script & Dev Owner", () => {
    it("seeds all 9 contract fixtures and dev owner can read them while another owner gets 404", async () => {
      const devOwner = "dev-owner-test-seed";
      const otherOwner = "other-owner-test";

      const seededIds = await runSeed(devOwner);
      expect(seededIds.length).toBe(9);
      expect(seededIds).toContain("scan-url-001");
      expect(seededIds).toContain("scan-priv-001");
      expect(seededIds).toContain("scan-site-001");

      const devScan = await scanRepository.getById("scan-url-001", devOwner);
      expect(devScan).not.toBeNull();
      expect(devScan?.scanId).toBe("scan-url-001");
      expect(devScan?.targetSummary).toBe("https://example.com/login");

      const otherScan = await scanRepository.getById("scan-url-001", otherOwner);
      expect(otherScan).toBeNull();
    });
  });
});
