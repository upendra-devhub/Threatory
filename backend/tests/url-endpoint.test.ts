import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { ApiSuccess, Report } from "@threatory/contracts";
import { app } from "../src/app.js";
import { Scan } from "../src/models/scan.js";

describe("POST /api/scans/url Endpoint", () => {
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

  it("analyses a valid URL, saves with 30-day expiresAt, and returns contract-valid report", async () => {
    const inputUrl = "http://198.51.100.23/login";

    const createRes = await request(app)
      .post("/api/scans/url")
      .send({ url: inputUrl })
      .expect(201);

    expect(createRes.body.success).toBe(true);

    // Validate payload against contract schema
    const parsedEnvelope = ApiSuccess(Report).parse(createRes.body);
    const report = parsedEnvelope.data;

    expect(report.scanId).toMatch(/^scan-url-/);
    expect(report.module).toBe("url");
    expect(report.status).toBe("completed");
    expect(report.rulesVersion).toBe("url-1.0.0");
    expect(report.targetSummary).toBe(inputUrl);
    expect(report.assessment.score).toBe(50);
    expect(report.assessment.riskLevel).toBe("medium");
    expect(report.assessment.label).toBe("Medium");
    expect(report.findings).toHaveLength(11);

    // Verify database persistence and 30-day TTL expiresAt
    const dbDoc = await Scan.findOne({ scanId: report.scanId }).exec();
    expect(dbDoc).not.toBeNull();
    expect(dbDoc?.module).toBe("url");
    expect(dbDoc?.ownerId).toBeDefined();

    const createdAtTime = new Date(report.createdAt).getTime();
    const expiresAtTime = dbDoc!.expiresAt.getTime();
    const diffDays = Math.round((expiresAtTime - createdAtTime) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);

    // GET /api/scans/<scanId> returns the identical report
    const getRes = await request(app)
      .get(`/api/scans/${report.scanId}`)
      .expect(200);

    const fetchedReport = ApiSuccess(Report).parse(getRes.body).data;
    expect(fetchedReport).toEqual(report);
  });

  it("the same input twice returns identical findings", async () => {
    const url = "https://example.com/verify?account=test";

    const res1 = await request(app)
      .post("/api/scans/url")
      .send({ url })
      .expect(201);

    const res2 = await request(app)
      .post("/api/scans/url")
      .send({ url })
      .expect(201);

    const report1 = res1.body.data;
    const report2 = res2.body.data;

    expect(report1.assessment).toEqual(report2.assessment);
    expect(report1.findings).toEqual(report2.findings);
    expect(report1.details).toEqual(report2.details);
    expect(report1.limitations).toEqual(report2.limitations);
  });

  describe("Validation Error Handling", () => {
    it("returns 400 VALIDATION_ERROR with field path 'url' for empty url", async () => {
      const res = await request(app)
        .post("/api/scans/url")
        .send({ url: "   " })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "url" }),
        ])
      );
    });

    it("returns 400 VALIDATION_ERROR with field path 'url' for unsupported scheme (U4)", async () => {
      const res = await request(app)
        .post("/api/scans/url")
        .send({ url: "ftp://example.com" })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toEqual([
        { path: "url", message: "Only HTTP and HTTPS URLs are supported" },
      ]);
    });

    it("returns 400 VALIDATION_ERROR with field path 'url' for URLs over 2048 characters", async () => {
      const longUrl = "https://example.com/" + "a".repeat(2050);
      const res = await request(app)
        .post("/api/scans/url")
        .send({ url: longUrl })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "url" }),
        ])
      );
    });

    it("returns 400 VALIDATION_ERROR for malformed URLs", async () => {
      const res = await request(app)
        .post("/api/scans/url")
        .send({ url: "http://" })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "url" }),
        ])
      );
    });
  });
});
