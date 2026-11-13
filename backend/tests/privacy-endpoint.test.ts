import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { ApiSuccess, Report } from "@threatory/contracts";
import { app } from "../src/app.js";
import { Scan } from "../src/models/scan.js";

describe("POST /api/scans/privacy Endpoint", () => {
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

  it("P1: analyses valid privacy request, persists with 7-day expiresAt, and returns 200 with masked data", async () => {
    const client = request.agent(app);
    const p1Input = {
      profiles: [
        {
          platform: "GitHub",
          username: "Jane.Doe",
          url: "https://github.com/jane-doe",
        },
        {
          platform: "X",
          username: "jane_doe",
        },
      ],
      submittedText: "Reach me at jane.doe@example.com or +1 213 373 4253",
      consent: true,
    };

    const res = await client
      .post("/api/scans/privacy")
      .send(p1Input)
      .expect(200);

    expect(res.body.success).toBe(true);

    const parsedEnvelope = ApiSuccess(Report).parse(res.body);
    const report = parsedEnvelope.data;

    expect(report.scanId).toMatch(/^scan-priv-/);
    expect(report.module).toBe("privacy");
    expect(report.status).toBe("completed");
    expect(report.rulesVersion).toBe("privacy-1.0.0");
    expect(report.assessment.riskLevel).toBe("medium");
    expect(report.assessment.label).toBe("4 exposure signals found");
    expect(report.assessment.score).toBeUndefined();

    // Verify raw values absent from response
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain("jane.doe@example.com");
    expect(jsonStr).not.toContain("213 373 4253");

    // Verify database document
    const savedDoc = await Scan.findOne({ scanId: report.scanId }).exec();
    expect(savedDoc).not.toBeNull();
    const docObj = savedDoc!.toObject();

    // Strictly ensure submittedText does NOT exist in stored document
    expect((docObj as unknown as Record<string, unknown>).submittedText).toBeUndefined();

    // 7-day retention verification
    const createdTime = savedDoc!.createdAt.getTime();
    const expiresTime = savedDoc!.expiresAt.getTime();
    const diffDays = Math.round((expiresTime - createdTime) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(7);
  });

  it("P2: processes normal supplied input returning 200, none_detected, and all pass findings", async () => {
    const client = request.agent(app);
    const p2Input = {
      profiles: [
        {
          platform: "GitHub",
          username: "alpha_dev",
        },
        {
          platform: "Reddit",
          username: "zeta42",
        },
      ],
      submittedText: "Just a normal sentence.",
      consent: true,
    };

    const res = await client
      .post("/api/scans/privacy")
      .send(p2Input)
      .expect(200);

    expect(res.body.success).toBe(true);
    const parsedEnvelope = ApiSuccess(Report).parse(res.body);
    const report = parsedEnvelope.data;

    expect(report.assessment.riskLevel).toBe("none_detected");
    expect(report.assessment.label).toBe("No exposure patterns detected");
    expect(report.findings.every((f) => f.outcome === "pass")).toBe(true);
  });

  it("P3: detects secrets and cards with fail outcome, high severity, returning 200", async () => {
    const client = request.agent(app);
    const p3Input = {
      profiles: [
        {
          platform: "GitHub",
          username: "alpha_dev",
        },
      ],
      submittedText: "Text containing AKIAIOSFODNN7EXAMPLE and 4111 1111 1111 1111",
      consent: true,
    };

    const res = await client
      .post("/api/scans/privacy")
      .send(p3Input)
      .expect(200);

    expect(res.body.success).toBe(true);
    const parsedEnvelope = ApiSuccess(Report).parse(res.body);
    const report = parsedEnvelope.data;

    expect(report.assessment.riskLevel).toBe("high");

    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(jsonStr).not.toContain("4111 1111 1111 1111");

    // Database document must not store secrets or raw text
    const savedDoc = await Scan.findOne({ scanId: report.scanId }).exec();
    const docStr = JSON.stringify(savedDoc!.toObject());
    expect(docStr).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(docStr).not.toContain("4111 1111 1111 1111");
    expect((savedDoc!.toObject() as unknown as Record<string, unknown>).submittedText).toBeUndefined();
  });

  it("P4: rejects consent false with 400 VALIDATION_ERROR identifying consent field", async () => {
    const client = request.agent(app);
    const p4Input = {
      profiles: [
        {
          platform: "GitHub",
          username: "Jane.Doe",
          url: "https://github.com/jane-doe",
        },
        {
          platform: "X",
          username: "jane_doe",
        },
      ],
      submittedText: "Reach me at jane.doe@example.com or +1 213 373 4253",
      consent: false,
    };

    const res = await client
      .post("/api/scans/privacy")
      .send(p4Input)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "consent" }),
      ])
    );

    // Ensure no document was persisted
    const count = await Scan.countDocuments();
    expect(count).toBe(0);
  });

  it("rejects missing consent with 400 VALIDATION_ERROR", async () => {
    const client = request.agent(app);
    const res = await client
      .post("/api/scans/privacy")
      .send({
        profiles: [{ platform: "GitHub", username: "dev" }],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "consent" }),
      ])
    );
  });

  it("rejects text exceeding 10,000 characters with 400 VALIDATION_ERROR", async () => {
    const client = request.agent(app);
    const res = await client
      .post("/api/scans/privacy")
      .send({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "a".repeat(10001),
        consent: true,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "submittedText" }),
      ])
    );
  });

  it("rejects malformed profile URLs with 400 VALIDATION_ERROR and correct field path", async () => {
    const client = request.agent(app);
    const res = await client
      .post("/api/scans/privacy")
      .send({
        profiles: [
          {
            platform: "GitHub",
            username: "dev",
            url: "not-a-valid-url",
          },
        ],
        consent: true,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "profiles.0.url" }),
      ])
    );
  });

  it("enforces owner isolation: retrieved by same owner, inaccessible to different owner", async () => {
    const originalDevOwner = process.env.DEV_OWNER_ID;
    delete process.env.DEV_OWNER_ID;

    try {
      const ownerClient = request.agent(app);
      const strangerClient = request.agent(app);

      const createRes = await ownerClient
        .post("/api/scans/privacy")
        .send({
          profiles: [{ platform: "GitHub", username: "dev" }],
          consent: true,
        })
        .expect(200);

      const scanId = createRes.body.data.scanId;

      // Owner can fetch their scan
      const getRes = await ownerClient
        .get(`/api/scans/${scanId}`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.scanId).toBe(scanId);

      // Stranger cannot fetch owner's scan
      const strangerRes = await strangerClient
        .get(`/api/scans/${scanId}`)
        .expect(404);

      expect(strangerRes.body.success).toBe(false);
      expect(strangerRes.body.error.code).toBe("NOT_FOUND");
    } finally {
      if (originalDevOwner !== undefined) {
        process.env.DEV_OWNER_ID = originalDevOwner;
      }
    }
  });
});
