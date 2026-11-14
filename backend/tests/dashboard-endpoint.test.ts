import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app.js";
import { Scan } from "../src/models/scan.js";
import { scanRepository } from "../src/repositories/scanRepository.js";
import { DashboardSummary } from "@threatory/contracts";

function extractCookie(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) {
    throw new Error("Missing set-cookie header");
  }
  return Array.isArray(raw) ? raw : [raw];
}

function extractOwnerId(cookies: string[]): string {
  const cookieStr = cookies[0] || "";
  const match = cookieStr.match(/tid=s%3A([^.;]+)/);
  if (!match || !match[1]) {
    throw new Error("Unable to extract ownerId from cookie");
  }
  return decodeURIComponent(match[1]);
}

describe("GET /api/dashboard/summary (Dashboard Summary Endpoint - CP-11 Task 2)", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    delete process.env.DEV_OWNER_ID;
    process.env.DISABLE_RATE_LIMIT = "true";
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
    delete process.env.DEV_OWNER_ID;
    await Scan.deleteMany({});
  });

  it("returns zero counts and empty recent scans for a fresh owner without scans", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = DashboardSummary.parse(res.body.data);
    expect(summary.totalScans).toBe(0);
    expect(summary.byModule).toEqual({
      url: 0,
      privacy: 0,
      website: 0,
    });
    expect(summary.byRiskLevel).toEqual({
      none_detected: 0,
      low: 0,
      medium: 0,
      high: 0,
    });
    expect(summary.recent).toEqual([]);
  });

  it("calculates exact totals, module breakdown, risk distribution, and 5 recent scans from seeded dataset", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    const baseTime = 1700000000000;

    // Seed dataset:
    // 4 URL scans: 1 none_detected, 1 low, 1 medium, 1 high
    // 3 Privacy scans: 1 none_detected, 1 low, 1 high
    // 2 Website scans: 1 low, 1 medium
    // Total scans: 9
    // byModule: url: 4, privacy: 3, website: 2
    // byRiskLevel: none_detected: 2, low: 3, medium: 2, high: 2
    const seedDefinitions = [
      { id: "s1", mod: "url" as const, risk: "none_detected" as const, timeOffset: 1000 },
      { id: "s2", mod: "url" as const, risk: "low" as const, timeOffset: 2000 },
      { id: "s3", mod: "url" as const, risk: "medium" as const, timeOffset: 3000 },
      { id: "s4", mod: "url" as const, risk: "high" as const, timeOffset: 4000 },
      { id: "s5", mod: "privacy" as const, risk: "none_detected" as const, timeOffset: 5000 },
      { id: "s6", mod: "privacy" as const, risk: "low" as const, timeOffset: 6000 },
      { id: "s7", mod: "privacy" as const, risk: "high" as const, timeOffset: 7000 },
      { id: "s8", mod: "website" as const, risk: "low" as const, timeOffset: 8000 },
      { id: "s9", mod: "website" as const, risk: "medium" as const, timeOffset: 9000 },
    ];

    for (const item of seedDefinitions) {
      await scanRepository.create({
        scanId: `scan-${item.id}`,
        ownerId: ownerA,
        module: item.mod,
        status: "completed",
        rulesVersion: `${item.mod}-1.0.0`,
        targetSummary: `Target for ${item.id}`,
        assessment: { label: item.risk, riskLevel: item.risk },
        findings: [],
        limitations: [],
        createdAt: new Date(baseTime + item.timeOffset),
      });
    }

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = DashboardSummary.parse(res.body.data);
    expect(summary.totalScans).toBe(9);
    expect(summary.byModule).toEqual({
      url: 4,
      privacy: 3,
      website: 2,
    });
    expect(summary.byRiskLevel).toEqual({
      none_detected: 2,
      low: 3,
      medium: 2,
      high: 2,
    });

    // Exactly 5 recent scans, newest first
    expect(summary.recent).toHaveLength(5);
    expect(summary.recent[0]?.scanId).toBe("scan-s9");
    expect(summary.recent[1]?.scanId).toBe("scan-s8");
    expect(summary.recent[2]?.scanId).toBe("scan-s7");
    expect(summary.recent[3]?.scanId).toBe("scan-s6");
    expect(summary.recent[4]?.scanId).toBe("scan-s5");
  });

  it("strictly isolates dashboard data between two owners (other owner's data never appears)", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    const resB = await request(app).get("/api/health");
    const cookieB = extractCookie(resB);
    const ownerB = extractOwnerId(cookieB);

    expect(ownerA).not.toBe(ownerB);

    // Owner A has 2 URL scans
    await scanRepository.create({
      scanId: "owner-a-scan-1",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://owner-a-site.com",
      assessment: { label: "High", riskLevel: "high" },
      findings: [],
      limitations: [],
    });
    await scanRepository.create({
      scanId: "owner-a-scan-2",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://owner-a-site-2.com",
      assessment: { label: "Low", riskLevel: "low" },
      findings: [],
      limitations: [],
    });

    // Owner B has 1 Privacy scan
    await scanRepository.create({
      scanId: "owner-b-scan-1",
      ownerId: ownerB,
      module: "privacy",
      status: "completed",
      rulesVersion: "privacy-1.0.0",
      targetSummary: "3 profiles",
      assessment: { label: "Medium", riskLevel: "medium" },
      findings: [],
      limitations: [],
    });

    // Verify Owner A's summary
    const sumA = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", cookieA);
    expect(sumA.status).toBe(200);
    const dataA = DashboardSummary.parse(sumA.body.data);
    expect(dataA.totalScans).toBe(2);
    expect(dataA.byModule).toEqual({ url: 2, privacy: 0, website: 0 });
    expect(dataA.byRiskLevel).toEqual({ none_detected: 0, low: 1, medium: 0, high: 1 });
    expect(dataA.recent.map((r) => r.scanId)).toEqual(["owner-a-scan-2", "owner-a-scan-1"]);

    // Verify Owner B's summary
    const sumB = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", cookieB);
    expect(sumB.status).toBe(200);
    const dataB = DashboardSummary.parse(sumB.body.data);
    expect(dataB.totalScans).toBe(1);
    expect(dataB.byModule).toEqual({ url: 0, privacy: 1, website: 0 });
    expect(dataB.byRiskLevel).toEqual({ none_detected: 0, low: 0, medium: 1, high: 0 });
    expect(dataB.recent.map((r) => r.scanId)).toEqual(["owner-b-scan-1"]);
  });

  it("reflects report deletion immediately in dashboard totals and recent scans", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    await scanRepository.create({
      scanId: "scan-to-delete",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://delete-me.com",
      assessment: { label: "High", riskLevel: "high" },
      findings: [],
      limitations: [],
    });

    // Initial check: 1 scan
    const before = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", cookieA);
    expect(before.body.data.totalScans).toBe(1);
    expect(before.body.data.byModule.url).toBe(1);
    expect(before.body.data.byRiskLevel.high).toBe(1);

    // Delete the scan
    const delRes = await request(app)
      .delete("/api/scans/scan-to-delete")
      .set("Cookie", cookieA);
    expect(delRes.status).toBe(200);

    // Dashboard check: 0 scans
    const after = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", cookieA);
    expect(after.body.data.totalScans).toBe(0);
    expect(after.body.data.byModule.url).toBe(0);
    expect(after.body.data.byRiskLevel.high).toBe(0);
    expect(after.body.data.recent).toHaveLength(0);
  });
});
