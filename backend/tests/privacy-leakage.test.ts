import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { createRequire } from "node:module";
import { app } from "../src/app.js";
import { Scan } from "../src/models/scan.js";
import { logger } from "../src/middleware/logger.js";
import { analysePrivacy } from "../src/modules/privacy/service.js";

const require = createRequire(import.meta.url);
const rawGoldenInputs = require("@threatory/contracts/golden-inputs.json") as Array<{
  id: string;
  module: string;
  input: Record<string, unknown>;
  expected: unknown;
}>;

describe("Privacy Analyzer Security, Leakage Prevention and Regression", () => {
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

  describe("Golden Inputs P1 to P4 from golden-inputs.json", () => {
    const p1Fixture = rawGoldenInputs.find((g) => g.id === "P1")!;
    const p2Fixture = rawGoldenInputs.find((g) => g.id === "P2")!;
    const p3Fixture = rawGoldenInputs.find((g) => g.id === "P3")!;
    const p4Fixture = rawGoldenInputs.find((g) => g.id === "P4")!;

    it("evaluates Golden Input P1 matching contract expectations", async () => {
      const client = request.agent(app);
      const res = await client
        .post("/api/scans/privacy")
        .send(p1Fixture.input)
        .expect(200);

      expect(res.body.success).toBe(true);
      const report = res.body.data;

      const expectedFindings = (p1Fixture.expected as { findings: { code: string; outcome: string }[] }).findings;
      for (const expected of expectedFindings) {
        const match = report.findings.find((f: { code: string }) => f.code === expected.code);
        expect(match).toBeDefined();
        expect(match.outcome).toBe(expected.outcome);
      }
    });

    it("evaluates Golden Input P2 matching contract expectations (allPass, none_detected)", async () => {
      const client = request.agent(app);
      const res = await client
        .post("/api/scans/privacy")
        .send(p2Fixture.input)
        .expect(200);

      expect(res.body.success).toBe(true);
      const report = res.body.data;
      expect(report.assessment.riskLevel).toBe("none_detected");
      expect(report.assessment.label).toBe("No exposure patterns detected");
      expect(report.findings.every((f: { outcome: string }) => f.outcome === "pass")).toBe(true);
    });

    it("evaluates Golden Input P3 matching contract expectations (secrets and cards fail)", async () => {
      const client = request.agent(app);
      const res = await client
        .post("/api/scans/privacy")
        .send(p3Fixture.input)
        .expect(200);

      expect(res.body.success).toBe(true);
      const report = res.body.data;
      expect(report.assessment.riskLevel).toBe("high");

      const expectedFindings = (p3Fixture.expected as { findings: { code: string; outcome: string }[] }).findings;
      for (const expected of expectedFindings) {
        const match = report.findings.find((f: { code: string }) => f.code === expected.code);
        expect(match).toBeDefined();
        expect(match.outcome).toBe(expected.outcome);
        expect(match.severity).toBe("high");
      }
    });

    it("evaluates Golden Input P4 matching contract expectations (consent: false -> 400 VALIDATION_ERROR)", async () => {
      const client = request.agent(app);
      const res = await client
        .post("/api/scans/privacy")
        .send(p4Fixture.input)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "consent" }),
        ])
      );
    });
  });

  describe("CRITICAL: Privacy Leakage Prevention Test", () => {
    it("ensures raw sensitive data never appears in HTTP response, database document, or logs", async () => {
      const rawEmail = "alice.smith.secret@example.com";
      const rawPhone = "+1 415 555 2671";
      const rawToken = "AKIAIOSFODNN7EXAMPLE";
      const rawCard = "4111 1111 1111 1111";
      const rawUsername = "AliceSecretSmith";
      const rawDisplayName = "Alice Secret Smith";
      const rawSubmittedText = `Confidential memo by ${rawDisplayName} (${rawUsername}). Reach me at ${rawEmail} or call ${rawPhone}. Secret AWS key: ${rawToken} and billing card: ${rawCard}.`;

      // 1. Capture Pino log output
      const capturedLogs: string[] = [];
      const originalLevel = logger.level;
      logger.level = "trace";

      const spyInfo = vi.spyOn(logger, "info").mockImplementation((...args: unknown[]) => {
        capturedLogs.push(JSON.stringify(args));
      });
      const spyWarn = vi.spyOn(logger, "warn").mockImplementation((...args: unknown[]) => {
        capturedLogs.push(JSON.stringify(args));
      });
      const spyError = vi.spyOn(logger, "error").mockImplementation((...args: unknown[]) => {
        capturedLogs.push(JSON.stringify(args));
      });
      const spyDebug = vi.spyOn(logger, "debug").mockImplementation((...args: unknown[]) => {
        capturedLogs.push(JSON.stringify(args));
      });

      let res: request.Response;
      try {
        const client = request.agent(app);
        res = await client
          .post("/api/scans/privacy")
          .send({
            profiles: [
              {
                platform: "GitHub",
                username: rawUsername,
              },
            ],
            displayName: rawDisplayName,
            submittedText: rawSubmittedText,
            consent: true,
          })
          .expect(200);
      } finally {
        logger.level = originalLevel;
        spyInfo.mockRestore();
        spyWarn.mockRestore();
        spyError.mockRestore();
        spyDebug.mockRestore();
      }

      // 2. Serialized HTTP response
      const serializedResponse = JSON.stringify(res.body);

      // 3. Serialized saved MongoDB document
      const scanId = res.body.data.scanId;
      const savedDoc = await Scan.findOne({ scanId }).exec();
      expect(savedDoc).not.toBeNull();
      const docObject = savedDoc!.toObject();
      const serializedDbDoc = JSON.stringify(docObject);

      // 4. Serialized captured log output
      const serializedLogs = capturedLogs.join("\n");

      const sensitiveTargets = [
        { label: "Raw Email", value: rawEmail },
        { label: "Raw Phone", value: rawPhone },
        { label: "Raw Token", value: rawToken },
        { label: "Raw Card", value: rawCard },
        { label: "Raw Username", value: rawUsername },
        { label: "Raw Display Name", value: rawDisplayName },
        { label: "Raw Text Fragment", value: "Confidential memo by" },
      ];

      for (const target of sensitiveTargets) {
        // Assert absence from HTTP response
        expect(
          serializedResponse.includes(target.value),
          `${target.label} leaked in HTTP response: "${target.value}"`
        ).toBe(false);

        // Assert absence from Database document
        expect(
          serializedDbDoc.includes(target.value),
          `${target.label} leaked in Database document: "${target.value}"`
        ).toBe(false);

        // Assert absence from Logs
        expect(
          serializedLogs.includes(target.value),
          `${target.label} leaked in Logs: "${target.value}"`
        ).toBe(false);
      }

      // Explicit assertion: submittedText field must NEVER exist in database document
      expect(
        (docObject as unknown as Record<string, unknown>).submittedText,
        "submittedText field must not exist in stored database document"
      ).toBeUndefined();

      // Ensure masked representations appear appropriately
      expect(serializedResponse).toContain("a***@example.com");
      expect(serializedResponse).toContain("+1 *** *** **71");
      expect(serializedResponse).toContain("AKIA********");
      expect(serializedResponse).toContain("**** **** **** 1111");
    });
  });

  describe("Error-Handling Leakage Tests", () => {
    it("does not echo raw values in Zod validation error responses or logs", async () => {
      const rawSecretUrl = "https://evil-unmatched-host.com/secret_leak_attempt_user";
      const client = request.agent(app);

      const capturedLogs: string[] = [];
      const spyWarn = vi.spyOn(logger, "warn").mockImplementation((...args: unknown[]) => {
        capturedLogs.push(JSON.stringify(args));
      });

      try {
        const res = await client
          .post("/api/scans/privacy")
          .send({
            profiles: [
              {
                platform: "GitHub",
                username: "normal_user",
                url: rawSecretUrl,
              },
            ],
            consent: true,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");

        const serializedResponse = JSON.stringify(res.body);
        expect(serializedResponse).not.toContain("secret_leak_attempt_user");
        expect(serializedResponse).not.toContain(rawSecretUrl);

        const serializedLogs = capturedLogs.join("\n");
        expect(serializedLogs).not.toContain("secret_leak_attempt_user");
      } finally {
        spyWarn.mockRestore();
      }
    });
  });

  describe("No-Network Verification", () => {
    it("stubs http, https, dns, and global fetch to throw and verifies Privacy Analyzer performs no network I/O", () => {
      const networkErrorMessage = "FATAL: Network call attempted in Privacy analyzer!";

      const spyHttpRequest = vi.spyOn(http, "request").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyHttpGet = vi.spyOn(http, "get").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyHttpsRequest = vi.spyOn(https, "request").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyHttpsGet = vi.spyOn(https, "get").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyDnsLookup = vi.spyOn(dns, "lookup").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyDnsResolve = vi.spyOn(dns, "resolve").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyFetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });

      try {
        const testInputs = [
          {
            profiles: [
              {
                platform: "GitHub",
                username: "alice",
                url: "https://github.com/alice",
              },
              {
                platform: "X",
                username: "alice",
                url: "https://x.com/alice",
              },
              {
                platform: "Instagram",
                username: "alice",
                url: "https://instagram.com/alice",
              },
              {
                platform: "LinkedIn",
                username: "alice",
                url: "https://linkedin.com/in/alice",
              },
              {
                platform: "Reddit",
                username: "alice",
                url: "https://reddit.com/user/alice",
              },
            ],
            submittedText: "Sample text with email alice@example.com and phone +1 213 373 4253",
            consent: true,
          },
          {
            profiles: [{ platform: "GitHub", username: "dev" }],
            submittedText: "AKIAIOSFODNN7EXAMPLE and 4111 1111 1111 1111",
            consent: true,
          },
        ];

        for (const input of testInputs) {
          expect(() => analysePrivacy(input)).not.toThrow();
        }

        expect(spyHttpRequest).not.toHaveBeenCalled();
        expect(spyHttpGet).not.toHaveBeenCalled();
        expect(spyHttpsRequest).not.toHaveBeenCalled();
        expect(spyHttpsGet).not.toHaveBeenCalled();
        expect(spyDnsLookup).not.toHaveBeenCalled();
        expect(spyDnsResolve).not.toHaveBeenCalled();
        expect(spyFetch).not.toHaveBeenCalled();
      } finally {
        spyHttpRequest.mockRestore();
        spyHttpGet.mockRestore();
        spyHttpsRequest.mockRestore();
        spyHttpsGet.mockRestore();
        spyDnsLookup.mockRestore();
        spyDnsResolve.mockRestore();
        spyFetch.mockRestore();
      }
    });
  });

  describe("Report Wording Semantics Verification", () => {
    it("ensures wording never claims identity, confirmed personhood, or internet-wide discovery", () => {
      const input = {
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

      const { report } = analysePrivacy(input);
      const serialized = JSON.stringify(report).toLowerCase();

      // Prohibited over-claiming words
      expect(serialized).not.toContain("same person");
      expect(serialized).not.toContain("confirmed identity");
      expect(serialized).not.toContain("belongs to the user");
      expect(serialized).not.toContain("internet-wide search found");
      expect(serialized).not.toContain("safe");
    });
  });
});
