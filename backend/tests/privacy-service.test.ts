import { describe, it, expect } from "vitest";
import { Report } from "@threatory/contracts";
import {
  analysePrivacy,
  buildTargetSummary,
  PRIVACY_LIMITATIONS,
} from "../src/modules/privacy/service.js";
import { normalisePrivacyInput } from "../src/modules/privacy/normalise.js";

describe("Privacy Service", () => {
  describe("buildTargetSummary", () => {
    it("formats summary with 1 profile and text", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Sample text with 25 characters",
        consent: true,
      });
      const summary = buildTargetSummary(input);
      expect(summary).toBe("1 profile, text provided (30 characters)");
      expect(summary).not.toContain("dev");
      expect(summary).not.toContain("Sample text");
    });

    it("formats summary with multiple profiles and no text", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "dev1" },
          { platform: "X", username: "dev2" },
        ],
        consent: true,
      });
      const summary = buildTargetSummary(input);
      expect(summary).toBe("2 profiles, no text provided");
    });
  });

  describe("analysePrivacy Report Construction", () => {
    it("P1 produces 4 warn signals, medium riskLevel, and validated Report", () => {
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

      const { report } = analysePrivacy(p1Input);

      expect(() => Report.parse(report)).not.toThrow();
      expect(report.module).toBe("privacy");
      expect(report.status).toBe("completed");
      expect(report.rulesVersion).toBe("privacy-1.0.0");
      expect(report.assessment.riskLevel).toBe("medium");
      expect(report.assessment.label).toBe("4 exposure signals found");
      expect(report.assessment.score).toBeUndefined();

      // Limitations
      expect(report.limitations).toEqual(PRIVACY_LIMITATIONS);

      // Verify findings
      const codes = report.findings.map((f) => f.code);
      expect(codes).toContain("PRIV_USERNAME_REUSE");
      expect(codes).toContain("PRIV_EMAIL_FOUND");
      expect(codes).toContain("PRIV_PHONE_FOUND");
      expect(codes).toContain("PRIV_USERNAME_MATCHES_EMAIL");

      // Verify masked evidence
      const emailFinding = report.findings.find((f) => f.code === "PRIV_EMAIL_FOUND");
      expect(emailFinding?.evidence).toContain("j***@example.com");
      expect(emailFinding?.evidence).not.toContain("jane.doe@example.com");

      const phoneFinding = report.findings.find((f) => f.code === "PRIV_PHONE_FOUND");
      expect(phoneFinding?.evidence).toContain("+1 *** *** **53");
      expect(phoneFinding?.evidence).not.toContain("213 373 4253");

      // Verify targetSummary
      expect(report.targetSummary).toBe("2 profiles, text provided (51 characters)");
    });

    it("P2 produces none_detected, all pass findings, and validated Report", () => {
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

      const { report } = analysePrivacy(p2Input);

      expect(() => Report.parse(report)).not.toThrow();
      expect(report.assessment.riskLevel).toBe("none_detected");
      expect(report.assessment.label).toBe("No exposure patterns detected");
      expect(report.assessment.score).toBeUndefined();

      // All findings pass
      for (const f of report.findings) {
        expect(f.outcome).toBe("pass");
        expect(f.severity).toBe("info");
      }
    });

    it("P3 produces high riskLevel and fail findings for secrets and cards", () => {
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

      const { report } = analysePrivacy(p3Input);

      expect(() => Report.parse(report)).not.toThrow();
      expect(report.assessment.riskLevel).toBe("high");
      expect(report.assessment.label).toBe("2 exposure signals found");

      const secretFinding = report.findings.find((f) => f.code === "PRIV_SECRET_FOUND");
      expect(secretFinding?.outcome).toBe("fail");
      expect(secretFinding?.severity).toBe("high");
      expect(secretFinding?.evidence).toContain("AKIA********");
      expect(secretFinding?.evidence).not.toContain("AKIAIOSFODNN7EXAMPLE");

      const cardFinding = report.findings.find((f) => f.code === "PRIV_CARD_FOUND");
      expect(cardFinding?.outcome).toBe("fail");
      expect(cardFinding?.severity).toBe("high");
      expect(cardFinding?.evidence).toContain("**** **** **** 1111");
      expect(cardFinding?.evidence).not.toContain("4111 1111 1111 1111");
    });
  });
});
