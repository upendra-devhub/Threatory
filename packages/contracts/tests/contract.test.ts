import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ApiError,
  DashboardSummary,
  Finding,
  HistoryPage,
  PrivacyScanRequest,
  Report,
  UrlScanRequest,
  WebsiteScanRequest,
} from "../src/index.js";

function loadFixture<T = unknown>(filename: string): T {
  const filePath = fileURLToPath(new URL(`../fixtures/${filename}`, import.meta.url));
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function loadGoldenInputs(): unknown[] {
  const filePath = fileURLToPath(new URL("../golden-inputs.json", import.meta.url));
  return JSON.parse(readFileSync(filePath, "utf-8")) as unknown[];
}

describe("Threatory Contracts - Fixture Validation", () => {
  const reportFixtures = [
    "url-report-completed.json",
    "url-report-partial.json",
    "url-report-failed.json",
    "privacy-report-completed.json",
    "privacy-report-partial.json",
    "privacy-report-failed.json",
    "website-report-completed.json",
    "website-report-partial.json",
    "website-report-failed.json",
  ];

  it.each(reportFixtures)("successfully parses report fixture: %s", (filename) => {
    const data = loadFixture(filename);
    const parsed = Report.parse(data);
    expect(parsed).toBeDefined();
    expect(parsed.scanId).toBeTruthy();
  });

  const errorFixtures = ["error-validation.json", "error-not-found.json", "error-rate-limit.json"];

  it.each(errorFixtures)("successfully parses error fixture: %s", (filename) => {
    const data = loadFixture(filename);
    const parsed = ApiError.parse(data);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBeDefined();
  });

  it("successfully parses history fixtures (populated and empty)", () => {
    const populated = HistoryPage.parse(loadFixture("history-page.json"));
    expect(populated.items.length).toBeGreaterThan(0);
    expect(populated.total).toBe(populated.items.length);

    const empty = HistoryPage.parse(loadFixture("history-empty.json"));
    expect(empty.items).toHaveLength(0);
    expect(empty.total).toBe(0);
  });

  it("successfully parses dashboard fixtures (populated and empty)", () => {
    const populated = DashboardSummary.parse(loadFixture("dashboard-summary.json"));
    expect(populated.totalScans).toBeGreaterThan(0);
    expect(populated.recent.length).toBeGreaterThan(0);

    const empty = DashboardSummary.parse(loadFixture("dashboard-empty.json"));
    expect(empty.totalScans).toBe(0);
    expect(empty.recent).toHaveLength(0);
  });
});

describe("Threatory Contracts - Malformed Variant Rejections", () => {
  it("rejects a 'warn' finding without a recommendation", () => {
    const malformed = {
      code: "URL_KEYWORDS",
      category: "host",
      title: "Sensitive keyword",
      outcome: "warn",
      severity: "low",
      evidence: "evidence",
      explanation: "explanation",
      // recommendation omitted
    };

    expect(() => Finding.parse(malformed)).toThrowError(
      /Recommendation is required when outcome is warn or fail/
    );
  });

  it("rejects a 'fail' finding with an empty recommendation", () => {
    const malformed = {
      code: "URL_IP_HOST",
      category: "host",
      title: "IP literal used",
      outcome: "fail",
      severity: "high",
      evidence: "evidence",
      explanation: "explanation",
      recommendation: "   ",
    };

    expect(() => Finding.parse(malformed)).toThrowError(
      /Recommendation is required when outcome is warn or fail/
    );
  });

  it("allows a 'pass' or 'not_assessed' finding without recommendation", () => {
    const passFinding = {
      code: "URL_NO_HTTPS",
      category: "host",
      title: "HTTPS present",
      outcome: "pass",
      severity: "info",
      evidence: "Uses https",
      explanation: "Good",
    };
    expect(() => Finding.parse(passFinding)).not.toThrow();

    const notAssessedFinding = {
      code: "URL_FEED_MATCH",
      category: "reputation",
      title: "Feed match",
      outcome: "not_assessed",
      severity: "info",
      evidence: "Skipped",
      explanation: "Service down",
    };
    expect(() => Finding.parse(notAssessedFinding)).not.toThrow();
  });

  it("rejects an unknown outcome", () => {
    const malformed = {
      code: "URL_KEYWORDS",
      category: "host",
      title: "Keyword",
      outcome: "safe", // illegal enum value (never "safe")
      severity: "info",
      evidence: "evidence",
      explanation: "explanation",
    };

    expect(() => Finding.parse(malformed)).toThrow();
  });

  it("rejects an unknown riskLevel (e.g. 'safe')", () => {
    const validReport = loadFixture<Record<string, unknown>>("url-report-completed.json");
    const malformedReport = {
      ...validReport,
      assessment: {
        ...(validReport["assessment"] as Record<string, unknown>),
        riskLevel: "safe",
      },
    };

    expect(() => Report.parse(malformedReport)).toThrow();
  });

  it("rejects a score outside 0 to 100", () => {
    const validReport = loadFixture<Record<string, unknown>>("url-report-completed.json");

    const negativeScoreReport = {
      ...validReport,
      assessment: {
        ...(validReport["assessment"] as Record<string, unknown>),
        score: -1,
      },
    };
    expect(() => Report.parse(negativeScoreReport)).toThrow();

    const excessiveScoreReport = {
      ...validReport,
      assessment: {
        ...(validReport["assessment"] as Record<string, unknown>),
        score: 101,
      },
    };
    expect(() => Report.parse(excessiveScoreReport)).toThrow();
  });

  it("rejects invalid datetime for createdAt", () => {
    const validReport = loadFixture<Record<string, unknown>>("url-report-completed.json");
    const invalidDateReport = {
      ...validReport,
      createdAt: "not-a-datetime",
    };

    expect(() => Report.parse(invalidDateReport)).toThrow();
  });

  it("rejects invalid ApiError code", () => {
    const malformedError = {
      success: false,
      error: {
        code: "UNKNOWN_CUSTOM_ERROR",
        message: "something broke",
      },
    };

    expect(() => ApiError.parse(malformedError)).toThrow();
  });
});

describe("Threatory Contracts - Request Validations", () => {
  it("validates UrlScanRequest", () => {
    expect(() => UrlScanRequest.parse({ url: "https://example.com" })).not.toThrow();
    expect(() => UrlScanRequest.parse({ url: "" })).toThrow();
  });

  it("validates PrivacyScanRequest", () => {
    const valid = {
      profiles: [{ platform: "GitHub", username: "valid_handle" }],
      consent: true,
    };
    expect(() => PrivacyScanRequest.parse(valid)).not.toThrow();

    // consent: false must fail
    expect(() =>
      PrivacyScanRequest.parse({
        ...valid,
        consent: false,
      })
    ).toThrow();

    // invalid username regex
    expect(() =>
      PrivacyScanRequest.parse({
        profiles: [{ platform: "GitHub", username: "invalid space!" }],
        consent: true,
      })
    ).toThrow();
  });

  it("validates WebsiteScanRequest", () => {
    expect(() =>
      WebsiteScanRequest.parse({
        url: "https://example.com",
        authorised: true,
      })
    ).not.toThrow();

    expect(() =>
      WebsiteScanRequest.parse({
        url: "https://example.com",
        authorised: false,
      })
    ).toThrow();
  });
});

describe("Threatory Contracts - Golden Inputs Data Integrity", () => {
  it("contains all expected golden inputs from Appendix C (U1-U8, P1-P4, W1-W3)", () => {
    const goldenInputs = loadGoldenInputs() as Array<{
      id: string;
      module: string;
      input: unknown;
    }>;
    const expectedIds = [
      "U1",
      "U2",
      "U3",
      "U4",
      "U5",
      "U6",
      "U7",
      "U8",
      "P1",
      "P2",
      "P3",
      "P4",
      "W1",
      "W2",
      "W3",
    ];

    expect(goldenInputs.length).toBe(expectedIds.length);
    const ids = goldenInputs.map((item) => item.id);
    expect(ids).toEqual(expectedIds);

    for (const item of goldenInputs) {
      expect(["url", "privacy", "website"]).toContain(item.module);
      expect(item.input).toBeDefined();
    }
  });
});
