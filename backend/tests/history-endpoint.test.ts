import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app.js";
import { Scan } from "../src/models/scan.js";
import { scanRepository } from "../src/repositories/scanRepository.js";
import { HistoryPage } from "@threatory/contracts";

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

describe("GET /api/scans (History Endpoint - CP-11 Task 1)", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
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
    await Scan.deleteMany({});
  });

  it("lists scans newest first with owner-scoping and contract conformance", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    const baseDate = new Date("2026-11-10T10:00:00.000Z");
    const scan1 = await scanRepository.create({
      scanId: "scan-hist-001",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://example.com/one",
      assessment: { label: "Low", riskLevel: "low", score: 20 },
      findings: [],
      limitations: [],
      createdAt: new Date(baseDate.getTime() + 1000),
    });

    const scan2 = await scanRepository.create({
      scanId: "scan-hist-002",
      ownerId: ownerA,
      module: "privacy",
      status: "completed",
      rulesVersion: "privacy-1.0.0",
      targetSummary: "2 profiles, 0 chars submitted",
      assessment: { label: "Medium", riskLevel: "medium" },
      findings: [],
      limitations: [],
      createdAt: new Date(baseDate.getTime() + 2000),
    });

    const scan3 = await scanRepository.create({
      scanId: "scan-hist-003",
      ownerId: ownerA,
      module: "website",
      status: "partial",
      rulesVersion: "website-1.0.0",
      targetSummary: "https://target.site",
      assessment: { label: "High", riskLevel: "high" },
      findings: [],
      limitations: [],
      createdAt: new Date(baseDate.getTime() + 3000),
    });

    const res = await request(app).get("/api/scans").set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const historyPage = HistoryPage.parse(res.body.data);
    expect(historyPage.total).toBe(3);
    expect(historyPage.page).toBe(1);
    expect(historyPage.limit).toBe(20);
    expect(historyPage.items).toHaveLength(3);

    // Newest first order
    expect(historyPage.items[0]?.scanId).toBe(scan3.scanId);
    expect(historyPage.items[1]?.scanId).toBe(scan2.scanId);
    expect(historyPage.items[2]?.scanId).toBe(scan1.scanId);

    // Never reveals sensitive fields
    for (const item of historyPage.items) {
      expect((item as Record<string, unknown>).findings).toBeUndefined();
      expect((item as Record<string, unknown>).ownerId).toBeUndefined();
    }
  });

  it("filters correctly by module and by status", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    await scanRepository.create({
      scanId: "scan-f-url",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://example.com/url",
      assessment: { label: "Low", riskLevel: "low" },
      findings: [],
      limitations: [],
    });

    await scanRepository.create({
      scanId: "scan-f-priv",
      ownerId: ownerA,
      module: "privacy",
      status: "failed",
      rulesVersion: "privacy-1.0.0",
      targetSummary: "1 profile",
      assessment: { label: "High", riskLevel: "high" },
      findings: [],
      limitations: [],
    });

    // Filter by module=url
    const resUrl = await request(app)
      .get("/api/scans?module=url")
      .set("Cookie", cookieA);
    expect(resUrl.status).toBe(200);
    expect(resUrl.body.data.total).toBe(1);
    expect(resUrl.body.data.items[0].scanId).toBe("scan-f-url");

    // Filter by module=website (empty)
    const resWebsite = await request(app)
      .get("/api/scans?module=website")
      .set("Cookie", cookieA);
    expect(resWebsite.status).toBe(200);
    expect(resWebsite.body.data.total).toBe(0);
    expect(resWebsite.body.data.items).toHaveLength(0);

    // Filter by status=failed
    const resFailed = await request(app)
      .get("/api/scans?status=failed")
      .set("Cookie", cookieA);
    expect(resFailed.status).toBe(200);
    expect(resFailed.body.data.total).toBe(1);
    expect(resFailed.body.data.items[0].scanId).toBe("scan-f-priv");
  });

  it("filters correctly by from and to dates", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    await scanRepository.create({
      scanId: "scan-d1",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://example.com/1",
      assessment: { label: "Low", riskLevel: "low" },
      findings: [],
      limitations: [],
      createdAt: new Date("2026-11-01T10:00:00.000Z"),
    });

    await scanRepository.create({
      scanId: "scan-d2",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://example.com/2",
      assessment: { label: "Low", riskLevel: "low" },
      findings: [],
      limitations: [],
      createdAt: new Date("2026-11-10T10:00:00.000Z"),
    });

    await scanRepository.create({
      scanId: "scan-d3",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://example.com/3",
      assessment: { label: "Low", riskLevel: "low" },
      findings: [],
      limitations: [],
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
    });

    // from 2026-11-05 to 2026-11-15 (only scan-d2)
    const resDateRange = await request(app)
      .get("/api/scans?from=2026-11-05T00:00:00.000Z&to=2026-11-15T00:00:00.000Z")
      .set("Cookie", cookieA);
    expect(resDateRange.status).toBe(200);
    expect(resDateRange.body.data.total).toBe(1);
    expect(resDateRange.body.data.items[0].scanId).toBe("scan-d2");

    // YYYY-MM-DD format support
    const resYmd = await request(app)
      .get("/api/scans?from=2026-11-10&to=2026-11-10")
      .set("Cookie", cookieA);
    expect(resYmd.status).toBe(200);
    expect(resYmd.body.data.total).toBe(1);
    expect(resYmd.body.data.items[0].scanId).toBe("scan-d2");
  });

  it("handles pagination with page and limit", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    for (let i = 1; i <= 5; i++) {
      await scanRepository.create({
        scanId: `scan-page-${i.toString().padStart(2, "0")}`,
        ownerId: ownerA,
        module: "url",
        status: "completed",
        rulesVersion: "url-1.0.0",
        targetSummary: `https://example.com/${i}`,
        assessment: { label: "Low", riskLevel: "low" },
        findings: [],
        limitations: [],
        createdAt: new Date(1700000000000 + i * 1000),
      });
    }

    const resPage1 = await request(app)
      .get("/api/scans?page=1&limit=2")
      .set("Cookie", cookieA);
    expect(resPage1.status).toBe(200);
    expect(resPage1.body.data.total).toBe(5);
    expect(resPage1.body.data.page).toBe(1);
    expect(resPage1.body.data.limit).toBe(2);
    expect(resPage1.body.data.items).toHaveLength(2);
    expect(resPage1.body.data.items[0].scanId).toBe("scan-page-05");
    expect(resPage1.body.data.items[1].scanId).toBe("scan-page-04");

    const resPage2 = await request(app)
      .get("/api/scans?page=2&limit=2")
      .set("Cookie", cookieA);
    expect(resPage2.status).toBe(200);
    expect(resPage2.body.data.items[0].scanId).toBe("scan-page-03");
    expect(resPage2.body.data.items[1].scanId).toBe("scan-page-02");

    const resPage3 = await request(app)
      .get("/api/scans?page=3&limit=2")
      .set("Cookie", cookieA);
    expect(resPage3.status).toBe(200);
    expect(resPage3.body.data.items[0].scanId).toBe("scan-page-01");
  });

  it("enforces max limit of 50 and rejects limit > 50 with 400 VALIDATION_ERROR", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);

    // limit=51 should fail
    const resOver = await request(app)
      .get("/api/scans?limit=51")
      .set("Cookie", cookieA);
    expect(resOver.status).toBe(400);
    expect(resOver.body.success).toBe(false);
    expect(resOver.body.error.code).toBe("VALIDATION_ERROR");

    // limit=50 should succeed
    const resExact = await request(app)
      .get("/api/scans?limit=50")
      .set("Cookie", cookieA);
    expect(resExact.status).toBe(200);
    expect(resExact.body.success).toBe(true);
    expect(resExact.body.data.limit).toBe(50);
  });

  it("rejects invalid input query parameters with 400 VALIDATION_ERROR", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);

    const testCases = [
      { query: "limit=0", field: "limit" },
      { query: "limit=-5", field: "limit" },
      { query: "limit=abc", field: "limit" },
      { query: "page=0", field: "page" },
      { query: "page=-1", field: "page" },
      { query: "page=xyz", field: "page" },
      { query: "module=malicious", field: "module" },
      { query: "status=unknown", field: "status" },
      { query: "from=not-a-date", field: "from" },
      { query: "to=invalid-date", field: "to" },
    ];

    for (const { query } of testCases) {
      const res = await request(app)
        .get(`/api/scans?${query}`)
        .set("Cookie", cookieA);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toBeDefined();
    }
  });

  it("strictly isolates scans between two owners (owner B never sees owner A's data)", async () => {
    const resA = await request(app).get("/api/health");
    const cookieA = extractCookie(resA);
    const ownerA = extractOwnerId(cookieA);

    const resB = await request(app).get("/api/health");
    const cookieB = extractCookie(resB);
    const ownerB = extractOwnerId(cookieB);

    expect(ownerA).not.toBe(ownerB);

    await scanRepository.create({
      scanId: "scan-owner-a-only",
      ownerId: ownerA,
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://owner-a-target.com",
      assessment: { label: "Low", riskLevel: "low" },
      findings: [],
      limitations: [],
    });

    // Owner A sees the scan
    const listA = await request(app).get("/api/scans").set("Cookie", cookieA);
    expect(listA.status).toBe(200);
    expect(listA.body.data.total).toBe(1);
    expect(listA.body.data.items[0].scanId).toBe("scan-owner-a-only");

    // Owner B sees an empty list
    const listB = await request(app).get("/api/scans").set("Cookie", cookieB);
    expect(listB.status).toBe(200);
    expect(listB.body.data.total).toBe(0);
    expect(listB.body.data.items).toHaveLength(0);
  });
});
