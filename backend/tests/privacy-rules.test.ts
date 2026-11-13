import { describe, it, expect } from "vitest";
import {
  isValidLuhn,
  extractValidCardSpans,
  extractValidEmails,
  checkUsernameReuse,
  checkUsernameSimilar,
  checkUrlUsernameMismatch,
  checkUsernamePersonalHint,
  checkEmailFound,
  checkUsernameMatchesEmail,
  checkPhoneFound,
  checkSecretFound,
  checkCardFound,
  runPrivacyRules,
} from "../src/modules/privacy/rules.js";
import { normalisePrivacyInput } from "../src/modules/privacy/normalise.js";

describe("Privacy Rules Engine", () => {
  describe("isValidLuhn", () => {
    it("validates standard 16-digit Visa-style card", () => {
      expect(isValidLuhn("4111 1111 1111 1111")).toBe(true);
      expect(isValidLuhn("4111-1111-1111-1111")).toBe(true);
      expect(isValidLuhn("4111111111111111")).toBe(true);
    });

    it("rejects numbers failing checksum", () => {
      expect(isValidLuhn("4111 1111 1111 1112")).toBe(false);
    });

    it("rejects non-digit and invalid length inputs", () => {
      expect(isValidLuhn("1234")).toBe(false);
      expect(isValidLuhn("4111 1111 1111 1111 9999")).toBe(false);
      expect(isValidLuhn("not-a-card-number")).toBe(false);
    });
  });

  describe("extractValidCardSpans", () => {
    it("locates valid card span in surrounding text", () => {
      const text = "Payment with 4111 1111 1111 1111 please";
      const spans = extractValidCardSpans(text);
      expect(spans).toHaveLength(1);
      expect(spans[0]?.card).toBe("4111 1111 1111 1111");
    });

    it("ignores invalid cards", () => {
      const text = "Card 4111 1111 1111 1112 is bogus";
      const spans = extractValidCardSpans(text);
      expect(spans).toHaveLength(0);
    });
  });

  describe("extractValidEmails", () => {
    it("extracts and validates valid emails", () => {
      const text = "Contact alice@example.com or bob@company.org";
      const emails = extractValidEmails(text);
      expect(emails).toEqual(["alice@example.com", "bob@company.org"]);
    });

    it("ignores invalid email patterns", () => {
      const text = "Visit www.example.com or user@invalid";
      const emails = extractValidEmails(text);
      expect(emails).toHaveLength(0);
    });
  });

  describe("RULE 1: PRIV_USERNAME_REUSE", () => {
    it("triggers low severity when username is reused across 2 profiles", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "Jane.Doe" },
          { platform: "X", username: "jane_doe" },
        ],
        consent: true,
      });

      const finding = checkUsernameReuse(input);
      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_USERNAME_REUSE");
      expect(finding.outcome).toBe("warn");
      expect(finding.severity).toBe("low");
      expect(finding.evidence).toContain("The same username was supplied across 2 profiles");
      expect(finding.recommendation).toBeDefined();
    });

    it("triggers medium severity when username is reused across 3 or more profiles", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "Jane.Doe" },
          { platform: "X", username: "jane_doe" },
          { platform: "Instagram", username: "jane-doe" },
        ],
        consent: true,
      });

      const finding = checkUsernameReuse(input);
      expect(finding.triggered).toBe(true);
      expect(finding.severity).toBe("medium");
      expect(finding.evidence).toContain("The same username was supplied across 3 profiles");
    });

    it("returns pass when all usernames are distinct", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "alpha_dev" },
          { platform: "Reddit", username: "zeta42" },
        ],
        consent: true,
      });

      const finding = checkUsernameReuse(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
      expect(finding.severity).toBe("info");
    });
  });

  describe("RULE 2: PRIV_USERNAME_SIMILAR", () => {
    it("triggers when distinct usernames have edit distance 1 and length >= 5", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "alpha1" },
          { platform: "Reddit", username: "alpha2" },
        ],
        consent: true,
      });

      const finding = checkUsernameSimilar(input);
      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_USERNAME_SIMILAR");
      expect(finding.outcome).toBe("warn");
      expect(finding.severity).toBe("low");
      expect(finding.recommendation).toBeDefined();
    });

    it("does not trigger when usernames are identical (handled by reuse)", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "alphadev" },
          { platform: "Reddit", username: "alphadev" },
        ],
        consent: true,
      });

      const finding = checkUsernameSimilar(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });

    it("does not trigger when username length is below 5 even with edit distance 1", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "cat1" },
          { platform: "Reddit", username: "cat2" },
        ],
        consent: true,
      });

      const finding = checkUsernameSimilar(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });

    it("returns pass when usernames are completely distinct", () => {
      const input = normalisePrivacyInput({
        profiles: [
          { platform: "GitHub", username: "alpha_dev" },
          { platform: "Reddit", username: "zeta42" },
        ],
        consent: true,
      });

      const finding = checkUsernameSimilar(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("RULE 3: PRIV_URL_USERNAME_MISMATCH", () => {
    it("triggers when typed username differs from supported profile URL username", () => {
      const input = normalisePrivacyInput({
        profiles: [
          {
            platform: "GitHub",
            username: "Jane.Doe",
            url: "https://github.com/different-user",
          },
        ],
        consent: true,
      });

      const finding = checkUrlUsernameMismatch(input);
      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_URL_USERNAME_MISMATCH");
      expect(finding.outcome).toBe("warn");
      expect(finding.severity).toBe("low");
      expect(finding.recommendation).toBeDefined();
    });

    it("passes when typed username matches supported profile URL username", () => {
      const input = normalisePrivacyInput({
        profiles: [
          {
            platform: "GitHub",
            username: "Jane.Doe",
            url: "https://github.com/jane-doe",
          },
        ],
        consent: true,
      });

      const finding = checkUrlUsernameMismatch(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });

    it("passes when no URLs are supplied", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "alpha_dev" }],
        consent: true,
      });

      const finding = checkUrlUsernameMismatch(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("RULE 4: PRIV_USERNAME_PERSONAL_HINT", () => {
    it("triggers when username ends with plausible birth year (1940-2026)", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "user_1995" }],
        consent: true,
      });

      const finding = checkUsernamePersonalHint(input);
      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_USERNAME_PERSONAL_HINT");
      expect(finding.outcome).toBe("warn");
      expect(finding.severity).toBe("low");
    });

    it("triggers when username contains display name fragment >= 4 chars", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "janedoe" }],
        displayName: "Jane Doe",
        consent: true,
      });

      const finding = checkUsernamePersonalHint(input);
      expect(finding.triggered).toBe(true);
      expect(finding.outcome).toBe("warn");
    });

    it("passes when no personal name hints or birth years are present", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "shadow_coder" }],
        displayName: "Bob Smith",
        consent: true,
      });

      const finding = checkUsernamePersonalHint(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("RULE 5: PRIV_EMAIL_FOUND", () => {
    it("triggers when valid email is in text", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Contact me at jane.doe@example.com",
        consent: true,
      });
      const emails = extractValidEmails(input.submittedText!);
      const finding = checkEmailFound(input, emails);

      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_EMAIL_FOUND");
      expect(finding.outcome).toBe("warn");
      expect(finding.severity).toBe("medium");
      expect(finding.evidence).toContain("j***@example.com");
      expect(finding.evidence).not.toContain("jane.doe@example.com");
    });

    it("passes when text contains no valid emails", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Just plain text here.",
        consent: true,
      });
      const emails = extractValidEmails(input.submittedText!);
      const finding = checkEmailFound(input, emails);

      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("RULE 6: PRIV_USERNAME_MATCHES_EMAIL", () => {
    it("triggers when normalised username matches email local part", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "Jane.Doe" }],
        submittedText: "Email: jane.doe@example.com",
        consent: true,
      });
      const emails = extractValidEmails(input.submittedText!);
      const finding = checkUsernameMatchesEmail(input, emails);

      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_USERNAME_MATCHES_EMAIL");
      expect(finding.outcome).toBe("warn");
      expect(finding.severity).toBe("medium");
      expect(finding.evidence).not.toContain("Jane.Doe");
      expect(finding.evidence).not.toContain("jane.doe@example.com");
    });

    it("passes when username does not match email local part", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "other_user" }],
        submittedText: "Email: jane.doe@example.com",
        consent: true,
      });
      const emails = extractValidEmails(input.submittedText!);
      const finding = checkUsernameMatchesEmail(input, emails);

      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("RULE 7: PRIV_PHONE_FOUND", () => {
    it("triggers when valid phone is in text and masks properly", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Reach me at +1 213 373 4253",
        consent: true,
      });
      const cardSpans = extractValidCardSpans(input.submittedText!);
      const finding = checkPhoneFound(input, cardSpans);

      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_PHONE_FOUND");
      expect(finding.outcome).toBe("warn");
      expect(finding.severity).toBe("medium");
      expect(finding.evidence).toContain("+1 *** *** **53");
      expect(finding.evidence).not.toContain("213 373");
    });

    it("does not treat payment card as a phone number", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "My card is 4111 1111 1111 1111",
        consent: true,
      });
      const cardSpans = extractValidCardSpans(input.submittedText!);
      const finding = checkPhoneFound(input, cardSpans);

      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("RULE 8: PRIV_SECRET_FOUND", () => {
    it("detects AWS access key with fail and high severity", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "AWS_KEY=AKIAIOSFODNN7EXAMPLE",
        consent: true,
      });
      const finding = checkSecretFound(input);

      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_SECRET_FOUND");
      expect(finding.outcome).toBe("fail");
      expect(finding.severity).toBe("high");
      expect(finding.evidence).toContain("AKIA********");
      expect(finding.evidence).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(finding.recommendation).toContain("revoke and rotate");
    });

    it("detects GitHub token", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Token is ghp_12345678901234567890",
        consent: true,
      });
      const finding = checkSecretFound(input);
      expect(finding.triggered).toBe(true);
      expect(finding.evidence).toContain("ghp_********");
    });

    it("detects Slack token", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Token is xoxb-1234567890-abcdef1234",
        consent: true,
      });
      const finding = checkSecretFound(input);
      expect(finding.triggered).toBe(true);
      expect(finding.evidence).toContain("xoxb********");
    });

    it("detects Google API key", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "AIzaSyD123456789012345678901234567890123",
        consent: true,
      });
      const finding = checkSecretFound(input);
      expect(finding.triggered).toBe(true);
      expect(finding.evidence).toContain("AIza********");
    });

    it("detects private key block", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----",
        consent: true,
      });
      const finding = checkSecretFound(input);
      expect(finding.triggered).toBe(true);
      expect(finding.evidence).toContain("REDACTED PRIVATE KEY BLOCK");
    });

    it("detects JWT token", () => {
      const jwt =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: `Bearer ${jwt}`,
        consent: true,
      });
      const finding = checkSecretFound(input);
      expect(finding.triggered).toBe(true);
      expect(finding.evidence).toContain("JWT: eyJh********");
    });

    it("passes when no secrets are present", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "No secrets here at all.",
        consent: true,
      });
      const finding = checkSecretFound(input);
      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("RULE 9: PRIV_CARD_FOUND", () => {
    it("detects valid card number with fail and high severity", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Card: 4111 1111 1111 1111",
        consent: true,
      });
      const cardSpans = extractValidCardSpans(input.submittedText!);
      const finding = checkCardFound(input, cardSpans);

      expect(finding.triggered).toBe(true);
      expect(finding.code).toBe("PRIV_CARD_FOUND");
      expect(finding.outcome).toBe("fail");
      expect(finding.severity).toBe("high");
      expect(finding.evidence).toContain("**** **** **** 1111");
      expect(finding.evidence).not.toContain("4111 1111");
      expect(finding.recommendation).toBeDefined();
    });

    it("passes when card fails Luhn algorithm", () => {
      const input = normalisePrivacyInput({
        profiles: [{ platform: "GitHub", username: "dev" }],
        submittedText: "Card: 4111 1111 1111 1112",
        consent: true,
      });
      const cardSpans = extractValidCardSpans(input.submittedText!);
      const finding = checkCardFound(input, cardSpans);

      expect(finding.triggered).toBe(false);
      expect(finding.outcome).toBe("pass");
    });
  });

  describe("runPrivacyRules suite integration", () => {
    it("evaluates Golden Input P1 correctly", () => {
      const input = normalisePrivacyInput({
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
      });

      const findings = runPrivacyRules(input);
      const triggeredCodes = findings.filter((f) => f.triggered).map((f) => f.code);

      expect(triggeredCodes).toContain("PRIV_USERNAME_REUSE");
      expect(triggeredCodes).toContain("PRIV_EMAIL_FOUND");
      expect(triggeredCodes).toContain("PRIV_PHONE_FOUND");
      expect(triggeredCodes).toContain("PRIV_USERNAME_MATCHES_EMAIL");

      // Verify outcomes
      expect(findings.find((f) => f.code === "PRIV_USERNAME_REUSE")?.outcome).toBe("warn");
      expect(findings.find((f) => f.code === "PRIV_EMAIL_FOUND")?.outcome).toBe("warn");
      expect(findings.find((f) => f.code === "PRIV_PHONE_FOUND")?.outcome).toBe("warn");
      expect(findings.find((f) => f.code === "PRIV_USERNAME_MATCHES_EMAIL")?.outcome).toBe("warn");
    });

    it("evaluates Golden Input P2 correctly (all pass)", () => {
      const input = normalisePrivacyInput({
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
      });

      const findings = runPrivacyRules(input);
      expect(findings.every((f) => f.outcome === "pass")).toBe(true);
      expect(findings.every((f) => f.severity === "info")).toBe(true);
    });

    it("evaluates Golden Input P3 correctly", () => {
      const input = normalisePrivacyInput({
        profiles: [
          {
            platform: "GitHub",
            username: "alpha_dev",
          },
        ],
        submittedText: "Text containing AKIAIOSFODNN7EXAMPLE and 4111 1111 1111 1111",
        consent: true,
      });

      const findings = runPrivacyRules(input);
      const secretFinding = findings.find((f) => f.code === "PRIV_SECRET_FOUND");
      const cardFinding = findings.find((f) => f.code === "PRIV_CARD_FOUND");

      expect(secretFinding?.outcome).toBe("fail");
      expect(secretFinding?.severity).toBe("high");
      expect(cardFinding?.outcome).toBe("fail");
      expect(cardFinding?.severity).toBe("high");
    });
  });
});
