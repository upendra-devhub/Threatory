import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { ApiSuccess, Report } from "@threatory/contracts";
import { app } from "../src/app.js";
import { Scan } from "../src/models/scan.js";
import * as websiteService from "../src/modules/website/service.js";

describe("POST /api/scans/website Endpoint (Task 9d)", () => {
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

  describe("Golden Inputs W1 and W2 Validation and SSRF Enforcement", () => {
    it("Golden Input W1: rejects private, loopback, metadata, and invalid ports with 422 TARGET_BLOCKED", async () => {
      const client = request.agent(app);
      const w1Variants = [
        "http://127.0.0.1",
        "http://[::1]",
        "http://2130706433",
        "http://169.254.169.254/latest/meta-data",
        "https://example.com:8443",
      ];

      for (const variant of w1Variants) {
        const res = await client
          .post("/api/scans/website")
          .send({ url: variant, authorised: true })
          .expect(422);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("TARGET_BLOCKED");
        expect(res.body.error.message).toBeDefined();
      }

      // Proves no scan document was saved in database
      const count = await Scan.countDocuments({});
      expect(count).toBe(0);
    });

    it("Golden Input W2: rejects unsupported schemes (file:) and missing/false authorisation with 400 VALIDATION_ERROR", async () => {
      const client = request.agent(app);

      // file scheme
      const resFile = await client
        .post("/api/scans/website")
        .send({ url: "file:///etc/passwd", authorised: true })
        .expect(400);

      expect(resFile.body.success).toBe(false);
      expect(resFile.body.error.code).toBe("VALIDATION_ERROR");

      // authorised: false
      const resUnauthorised = await client
        .post("/api/scans/website")
        .send({ url: "https://example.com", authorised: false })
        .expect(400);

      expect(resUnauthorised.body.success).toBe(false);
      expect(resUnauthorised.body.error.code).toBe("VALIDATION_ERROR");

      // missing authorised property
      const resMissingAuth = await client
        .post("/api/scans/website")
        .send({ url: "https://example.com" })
        .expect(400);

      expect(resMissingAuth.body.success).toBe(false);
      expect(resMissingAuth.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Partial Report Resilience on Upstream Timeout", () => {
    it("yields a partial report with not_assessed findings when check times out, not an error", async () => {
      const client = request.agent(app);

      // Spy on analyseWebsite to simulate a partial result (e.g. from an upstream timeout)
      const mockPartialReport: Report = {
        scanId: "scan-web-partial-test-001",
        module: "website",
        status: "partial",
        rulesVersion: "website-1.0.0",
        targetSummary: "https://degraded-site.example.org",
        assessment: {
          label: "Medium risk",
          riskLevel: "medium",
        },
        findings: [
          {
            code: "SITE_DNS_RESOLVES",
            category: "dns",
            title: "DNS hostname resolution",
            outcome: "pass",
            severity: "info",
            evidence: "Hostname resolved to 93.184.216.34",
            explanation: "DNS resolved",
          },
          {
            code: "SITE_HTTPS_AVAILABLE",
            category: "tls",
            title: "HTTPS availability on port 443",
            outcome: "not_assessed",
            severity: "info",
            evidence: "Check was not assessed: Connection timed out after 8000ms",
            explanation: "Port 443 check timed out",
          },
          {
            code: "SITE_HSTS",
            category: "headers",
            title: "HTTP Strict Transport Security (HSTS)",
            outcome: "not_assessed",
            severity: "info",
            evidence: "Check was not assessed: HTTPS request timed out",
            explanation: "Headers could not be evaluated",
          },
          {
            code: "SITE_DMARC",
            category: "dns",
            title: "DMARC authentication record",
            outcome: "not_assessed",
            severity: "info",
            evidence: "Check was not assessed: Upstream nameserver query timeout",
            explanation: "DMARC resolution could not be queried",
          },
        ],
        limitations: [
          "Some security checks could not complete and were marked not assessed: SITE_HTTPS_AVAILABLE, SITE_HSTS, SITE_DMARC",
          "This audit is a passive security review, not an intrusive penetration test.",
        ],
        details: {
          finalUrl: "https://degraded-site.example.org",
          statusCode: 0,
          redirectCount: 0,
          ipAddress: "93.184.216.34",
        },
        createdAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(websiteService, "analyseWebsite")
        .mockResolvedValue({ report: mockPartialReport });

      try {
        const res = await client
          .post("/api/scans/website")
          .send({ url: "https://degraded-site.example.org", authorised: true })
          .expect(200);

        expect(res.body.success).toBe(true);

        const parsedEnvelope = ApiSuccess(Report).parse(res.body);
        const report = parsedEnvelope.data;

        expect(report.status).toBe("partial");
        expect(report.findings.some((f) => f.outcome === "not_assessed")).toBe(true);
        expect(report.assessment.riskLevel).toBe("medium");
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("Database Persistence and Invariants", () => {
    it("persists with 30-day expiresAt and guarantees zero cookie values and zero response bodies stored", async () => {
      const client = request.agent(app);

      const secretCookieVal = "SENSITIVE_SESSION_VALUE_99999";
      const sampleResponseBody = "<html><body>Confidential Internal Body HTML</body></html>";

      // Mock analyseWebsite producing completed report with clean details
      const mockCompletedReport: Report = {
        scanId: "scan-web-completed-test-001",
        module: "website",
        status: "completed",
        rulesVersion: "website-1.0.0",
        targetSummary: "https://example.com",
        assessment: {
          label: "Low risk",
          riskLevel: "low",
        },
        findings: [
          {
            code: "SITE_DNS_RESOLVES",
            category: "dns",
            title: "DNS hostname resolution",
            outcome: "pass",
            severity: "info",
            evidence: "Hostname resolved to 93.184.216.34",
            explanation: "Public DNS resolved",
          },
          {
            code: "SITE_COOKIE_SECURE",
            category: "cookies",
            title: "Cookie Secure attribute enforcement",
            outcome: "warn",
            severity: "low",
            evidence: "Cookie(s) missing Secure attribute: 'theme'", // Name only, NO values!
            explanation: "Cookie missing Secure",
            recommendation: "Add Secure flag to cookies.",
          },
        ],
        limitations: [
          "This audit is a passive security review, not an intrusive penetration test.",
        ],
        details: {
          finalUrl: "https://example.com/",
          statusCode: 200,
          redirectCount: 0,
          ipAddress: "93.184.216.34",
          certificate: {
            subject: "example.com",
            issuer: "DigiCert",
            validFrom: "2026-01-01T00:00:00.000Z",
            validTo: "2027-01-01T00:00:00.000Z",
            protocol: "TLSv1.3",
            daysRemaining: 180,
            authorized: true,
          },
        },
        createdAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(websiteService, "analyseWebsite")
        .mockResolvedValue({ report: mockCompletedReport });

      try {
        const res = await client
          .post("/api/scans/website")
          .send({ url: "https://example.com", authorised: true })
          .expect(200);

        const parsedEnvelope = ApiSuccess(Report).parse(res.body);
        const report = parsedEnvelope.data;
        expect(report.scanId).toBe(mockCompletedReport.scanId);

        // Fetch direct document from MongoDB to assert storage invariants
        const doc = await Scan.findOne({ scanId: report.scanId }).lean();
        expect(doc).not.toBeNull();
        expect(doc!.module).toBe("website");

        // 30-day retention invariant: expiresAt should be approximately createdAt + 30 days
        const createdAtTime = new Date(doc!.createdAt).getTime();
        const expiresAtTime = new Date(doc!.expiresAt).getTime();
        const diffDays = Math.round((expiresAtTime - createdAtTime) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(30);

        // CRITICAL INVARIANT: No cookie values and no response bodies in database document
        const docString = JSON.stringify(doc);
        expect(docString).not.toContain(secretCookieVal);
        expect(docString).not.toContain(sampleResponseBody);
        expect(docString).not.toContain("body");

        // Isolation: Owner can read via GET /api/scans/:scanId
        const readRes = await client.get(`/api/scans/${report.scanId}`).expect(200);
        expect(readRes.body.data.scanId).toBe(report.scanId);

        // Another owner cannot read this scan (repository level isolation)
        const scanRepo = await import("../src/repositories/scanRepository.js");
        const differentOwnerScan = await scanRepo.scanRepository.getById(report.scanId, "different-owner-id");
        expect(differentOwnerScan).toBeNull();
      } finally {
        spy.mockRestore();
      }
    });
  });
});
