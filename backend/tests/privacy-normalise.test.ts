import { describe, it, expect } from "vitest";
import {
  normaliseUsername,
  normalisePlatform,
  parseProfileUrl,
  extractDisplayNameParts,
  normalisePrivacyInput,
} from "../src/modules/privacy/normalise.js";
import { AppError } from "../src/middleware/errors.js";

describe("Privacy Request Normalization (CP-07 Task 1)", () => {
  describe("normaliseUsername", () => {
    it("converts to lowercase and strips '.', '_', and '-'", () => {
      expect(normaliseUsername("Jane.Doe")).toBe("janedoe");
      expect(normaliseUsername("jane_doe")).toBe("janedoe");
      expect(normaliseUsername("jane-doe")).toBe("janedoe");
      expect(normaliseUsername("Alpha_Dev-99.test")).toBe("alphadev99test");
    });
  });

  describe("normalisePlatform", () => {
    it("normalises platform aliases particularly X and Twitter", () => {
      expect(normalisePlatform("X")).toBe("x_twitter");
      expect(normalisePlatform("Twitter")).toBe("x_twitter");
      expect(normalisePlatform("  x  ")).toBe("x_twitter");
      expect(normalisePlatform("GitHub")).toBe("github");
      expect(normalisePlatform("LinkedIn")).toBe("linkedin");
    });
  });

  describe("parseProfileUrl", () => {
    it("extracts username from GitHub profile URL", () => {
      const res = parseProfileUrl("https://github.com/jane-doe", "GitHub", "profiles.0.url");
      expect(res.extractedUsername).toBe("jane-doe");
      expect(res.platformSupported).toBe(true);
    });

    it("handles trailing slash, www, and query params / fragments", () => {
      const res = parseProfileUrl(
        "https://www.github.com/jane-doe/?tab=repositories#top",
        "GitHub",
        "profiles.0.url"
      );
      expect(res.extractedUsername).toBe("jane-doe");
    });

    it("extracts username from X and Twitter profile URLs", () => {
      const res1 = parseProfileUrl("https://x.com/janedoe", "X", "profiles.0.url");
      expect(res1.extractedUsername).toBe("janedoe");

      const res2 = parseProfileUrl("https://twitter.com/janedoe", "Twitter", "profiles.0.url");
      expect(res2.extractedUsername).toBe("janedoe");
    });

    it("extracts username from LinkedIn (/in/) and Reddit (/user/ or /u/)", () => {
      const resIn = parseProfileUrl("https://linkedin.com/in/jane-doe", "LinkedIn", "profiles.0.url");
      expect(resIn.extractedUsername).toBe("jane-doe");

      const resReddit = parseProfileUrl("https://reddit.com/user/jane_doe", "Reddit", "profiles.0.url");
      expect(resReddit.extractedUsername).toBe("jane_doe");
    });

    it("rejects host mismatch for recognized platforms", () => {
      expect(() =>
        parseProfileUrl("https://evil.com/jane-doe", "GitHub", "profiles.0.url")
      ).toThrow(AppError);
    });

    it("rejects unsupported URL schemes like javascript:", () => {
      expect(() =>
        parseProfileUrl("javascript:alert(1)", "GitHub", "profiles.0.url")
      ).toThrow(AppError);
    });

    it("marks unsupported platform as platformSupported: false without throwing", () => {
      const res = parseProfileUrl("https://mastodon.social/@jane", "Mastodon", "profiles.0.url");
      expect(res.platformSupported).toBe(false);
      expect(res.extractedUsername).toBeUndefined();
    });
  });

  describe("extractDisplayNameParts", () => {
    it("extracts word components with length >= 4", () => {
      expect(extractDisplayNameParts("Jane Doe")).toEqual(["jane"]);
      expect(extractDisplayNameParts("Alexander Hamilton")).toEqual(["alexander", "hamilton"]);
      expect(extractDisplayNameParts("Bob Li")).toEqual([]);
      expect(extractDisplayNameParts("")).toEqual([]);
      expect(extractDisplayNameParts(undefined)).toEqual([]);
    });
  });

  describe("normalisePrivacyInput", () => {
    it("validates and normalises valid P1 request", () => {
      const input = {
        profiles: [
          { platform: "GitHub", username: "Jane.Doe", url: "https://github.com/jane-doe" },
          { platform: "X", username: "jane_doe" },
        ],
        displayName: "Jane Doe",
        submittedText: "Reach me at jane.doe@example.com or +1 213 373 4253",
        consent: true,
      };

      const result = normalisePrivacyInput(input);
      expect(result.profiles).toHaveLength(2);

      expect(result.profiles[0]?.typedUsername).toBe("Jane.Doe");
      expect(result.profiles[0]?.normalisedTypedUsername).toBe("janedoe");
      expect(result.profiles[0]?.extractedUsername).toBe("jane-doe");
      expect(result.profiles[0]?.normalisedExtractedUsername).toBe("janedoe");

      expect(result.profiles[1]?.typedUsername).toBe("jane_doe");
      expect(result.profiles[1]?.normalisedTypedUsername).toBe("janedoe");

      expect(result.normalisedDisplayNameParts).toEqual(["jane"]);
      expect(result.consent).toBe(true);
    });

    it("rejects consent: false with VALIDATION_ERROR identifying field 'consent'", () => {
      expect.assertions(3);
      try {
        normalisePrivacyInput({
          profiles: [{ platform: "GitHub", username: "Jane.Doe" }],
          consent: false,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION_ERROR");
        expect(appErr.fields?.[0]?.path).toBe("consent");
      }
    });

    it("rejects missing consent with VALIDATION_ERROR", () => {
      expect.assertions(2);
      try {
        normalisePrivacyInput({
          profiles: [{ platform: "GitHub", username: "Jane.Doe" }],
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION_ERROR");
      }
    });

    it("rejects text exceeding 10,000 characters", () => {
      expect.assertions(3);
      try {
        normalisePrivacyInput({
          profiles: [{ platform: "GitHub", username: "Jane.Doe" }],
          submittedText: "a".repeat(10001),
          consent: true,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION_ERROR");
        expect(appErr.fields?.[0]?.path).toBe("submittedText");
      }
    });
  });
});
