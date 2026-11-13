import { describe, it, expect } from "vitest";
import {
  maskEmail,
  maskPhone,
  maskToken,
  maskCard,
  maskUsername,
} from "../src/modules/privacy/masking.js";

describe("Sensitive Data Masking Utilities (CP-07 Task 2)", () => {
  describe("maskEmail", () => {
    it("masks email revealing only first character of local part and domain", () => {
      const masked = maskEmail("jane.doe@example.com");
      expect(masked).toBe("j***@example.com");
      expect(masked).not.toContain("jane");
      expect(masked).not.toContain("doe");
    });

    it("handles single-character local part safely", () => {
      const masked = maskEmail("j@example.com");
      expect(masked).toBe("j***@example.com");
    });

    it("handles malformed emails defensively", () => {
      expect(maskEmail("invalid-email")).toBe("***@***");
      expect(maskEmail("")).toBe("***@***");
    });

    it("never returns the complete email", () => {
      const raw = "supersecretuser@corp.internal";
      const masked = maskEmail(raw);
      expect(masked).not.toBe(raw);
      expect(masked.length).toBeLessThan(raw.length);
    });
  });

  describe("maskPhone", () => {
    it("masks phone revealing only the final two digits (+1 213 373 4253 -> +1 *** *** **53)", () => {
      const masked = maskPhone("+1 213 373 4253");
      expect(masked).toBe("+1 *** *** **53");
      expect(masked).not.toContain("213");
      expect(masked).not.toContain("373");
      expect(masked).toContain("53");
    });

    it("masks unformatted phone numbers", () => {
      const masked = maskPhone("12133734253");
      expect(masked.endsWith("53")).toBe(true);
      expect(masked).not.toContain("213");
    });

    it("never returns the complete phone number", () => {
      const raw = "+44 7911 123456";
      const masked = maskPhone(raw);
      expect(masked).not.toBe(raw);
      expect(masked).toContain("56");
      expect(masked).not.toContain("7911");
    });
  });

  describe("maskToken", () => {
    it("masks AWS access key revealing only AKIA prefix", () => {
      const masked = maskToken("AWS key", "AKIAIOSFODNN7EXAMPLE");
      expect(masked).toBe("AWS key: AKIA********");
      expect(masked).not.toContain("IOSFODNN7EXAMPLE");
    });

    it("masks GitHub token revealing only ghp_ prefix", () => {
      const masked = maskToken("GitHub token", "ghp_1234567890abcdefghijklmnopqrstuvwxyz");
      expect(masked).toBe("GitHub token: ghp_********");
      expect(masked).not.toContain("abcdef");
    });

    it("masks Slack token revealing only xoxb prefix", () => {
      const masked = maskToken("Slack token", "xoxb-1234567890-1234567890-abcdef123456");
      expect(masked).toBe("Slack token: xoxb********");
      expect(masked).not.toContain("abcdef");
    });

    it("masks Google API key revealing only AIza prefix", () => {
      const masked = maskToken("Google API key", "AIzaSyD-1234567890abcdefghijklmnopqr");
      expect(masked).toBe("Google API key: AIza********");
      expect(masked).not.toContain("SyD");
    });

    it("masks private-key block by category name only", () => {
      const masked = maskToken("Private key", "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...");
      expect(masked).toBe("Private key: [REDACTED PRIVATE KEY BLOCK]");
      expect(masked).not.toContain("MIIEowIBAAKCAQEA");
    });

    it("masks JWT revealing only first 4 chars", () => {
      const masked = maskToken("JWT", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis");
      expect(masked).toBe("JWT: eyJh********");
      expect(masked).not.toContain("doNotLeakThis");
    });

    it("never returns the complete token", () => {
      const raw = "AKIAV7SECRETKEY999";
      const masked = maskToken("AWS key", raw);
      expect(masked).not.toBe(raw);
    });
  });

  describe("maskCard", () => {
    it("masks card with spaces revealing only final 4 digits", () => {
      const masked = maskCard("4111 1111 1111 1111");
      expect(masked).toBe("**** **** **** 1111");
      expect(masked).not.toContain("4111");
    });

    it("masks card with hyphens revealing only final 4 digits", () => {
      const masked = maskCard("4111-1111-1111-1111");
      expect(masked).toBe("****-****-****-1111");
    });

    it("masks continuous 16-digit card", () => {
      const masked = maskCard("4111111111111111");
      expect(masked).toBe("************1111");
    });

    it("never returns the complete card number", () => {
      const raw = "5500 0000 0000 0004";
      const masked = maskCard(raw);
      expect(masked).not.toBe(raw);
      expect(masked).not.toContain("5500");
    });
  });

  describe("maskUsername", () => {
    it("masks usernames revealing only boundary letters", () => {
      expect(maskUsername("Jane.Doe")).toBe("J***e");
      expect(maskUsername("jane_doe")).toBe("j***e");
      expect(maskUsername("alphadev")).toBe("a***v");
    });

    it("handles short usernames safely", () => {
      expect(maskUsername("li")).toBe("l*");
      expect(maskUsername("a")).toBe("*");
      expect(maskUsername("")).toBe("***");
    });

    it("never returns the complete username", () => {
      const raw = "supersecretuser";
      const masked = maskUsername(raw);
      expect(masked).not.toBe(raw);
    });
  });
});
