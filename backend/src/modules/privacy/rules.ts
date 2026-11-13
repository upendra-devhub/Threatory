import { distance } from "fastest-levenshtein";
import validator from "validator";
import { findPhoneNumbersInText } from "libphonenumber-js";
import { NormalisedPrivacyInput, normaliseUsername } from "./normalise.js";
import { maskEmail, maskPhone, maskToken, maskCard, maskUsername } from "./masking.js";
import { privacyRuleConfigs, PrivacyRuleCode } from "./rules.config.js";

export interface PrivacyFindingResult {
  code: PrivacyRuleCode;
  category: string;
  title: string;
  outcome: "pass" | "warn" | "fail" | "not_assessed";
  severity: "info" | "low" | "medium" | "high";
  evidence: string;
  explanation: string;
  recommendation?: string;
  triggered: boolean;
}

/**
 * Validates a payment card number string (13-19 digits, spaces/hyphens allowed)
 * using the standard Luhn algorithm checksum.
 */
export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n -= 9;
      }
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

interface CardSpan {
  card: string;
  start: number;
  end: number;
}

/**
 * Extracts confirmed payment card spans from text.
 */
export function extractValidCardSpans(text: string): CardSpan[] {
  if (!text) return [];
  const cardCandidateRegex = /\b\d(?:[ -]?\d){12,18}\b/g;
  const spans: CardSpan[] = [];
  let match: RegExpExecArray | null;

  while ((match = cardCandidateRegex.exec(text)) !== null) {
    const candidate = match[0];
    if (isValidLuhn(candidate)) {
      spans.push({
        card: candidate,
        start: match.index,
        end: match.index + candidate.length,
      });
    }
  }

  return spans;
}

/**
 * RULE 1 — PRIV_USERNAME_REUSE
 * Triggered when two or more supplied profile entries share the same normalized username.
 * Severity: "low" for 2 matching entries, "medium" for 3 or more entries.
 */
export function checkUsernameReuse(input: NormalisedPrivacyInput): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_USERNAME_REUSE;
  const usernameCounts = new Map<string, { count: number; sampleUsername: string }>();

  for (const profile of input.profiles) {
    const existing = usernameCounts.get(profile.normalisedTypedUsername);
    if (existing) {
      existing.count += 1;
    } else {
      usernameCounts.set(profile.normalisedTypedUsername, {
        count: 1,
        sampleUsername: profile.typedUsername,
      });
    }
  }

  let maxReuseCount = 0;
  let reusedSample = "";

  for (const [, info] of usernameCounts) {
    if (info.count >= 2 && info.count > maxReuseCount) {
      maxReuseCount = info.count;
      reusedSample = info.sampleUsername;
    }
  }

  if (maxReuseCount >= 2) {
    const severity = maxReuseCount >= 3 ? "medium" : "low";
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "warn",
      severity,
      evidence: `The same username was supplied across ${maxReuseCount} profiles (masked: ${maskUsername(reusedSample)}).`,
      explanation:
        "The same username was supplied across multiple profiles. Reusing usernames across services allows accounts to be correlated across platforms.",
      recommendation:
        "Consider using distinct usernames across services to prevent correlation of your online presence.",
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "All supplied profiles use distinct usernames.",
    explanation: "No duplicate or reused usernames were detected across the supplied profiles.",
    triggered: false,
  };
}

/**
 * RULE 2 — PRIV_USERNAME_SIMILAR
 * Triggered when two different normalized usernames have an edit distance of exactly 1
 * and both usernames have a normalized length of at least five characters.
 */
export function checkUsernameSimilar(input: NormalisedPrivacyInput): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_USERNAME_SIMILAR;

  // Extract unique distinct normalized usernames with length >= 5
  const uniqueProfiles = new Map<string, string>();
  for (const p of input.profiles) {
    if (p.normalisedTypedUsername.length >= 5 && !uniqueProfiles.has(p.normalisedTypedUsername)) {
      uniqueProfiles.set(p.normalisedTypedUsername, p.typedUsername);
    }
  }

  const entries = Array.from(uniqueProfiles.entries());
  const similarPairs: { u1: string; u2: string }[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [norm1, raw1] = entries[i]!;
      const [norm2, raw2] = entries[j]!;

      // Exclude identical usernames (handled by reuse)
      if (norm1 !== norm2 && distance(norm1, norm2) === 1) {
        similarPairs.push({ u1: raw1, u2: raw2 });
      }
    }
  }

  if (similarPairs.length > 0) {
    const pair = similarPairs[0]!;
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "warn",
      severity: "low",
      evidence: `Supplied usernames have an edit distance of 1 (masked: ${maskUsername(pair.u1)} and ${maskUsername(pair.u2)}).`,
      explanation:
        "Supplied usernames differ by only a single character. Highly similar usernames across platforms may still allow accounts to be correlated.",
      recommendation:
        "Use unrelated username patterns across platforms if you wish to minimize correlation risks.",
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No similar username variations detected among supplied profiles.",
    explanation: "Supplied usernames do not exhibit single-character variations.",
    triggered: false,
  };
}

/**
 * RULE 3 — PRIV_URL_USERNAME_MISMATCH
 * Triggered when the username extracted from a supported profile URL differs from the typed username.
 */
export function checkUrlUsernameMismatch(input: NormalisedPrivacyInput): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_URL_USERNAME_MISMATCH;
  const mismatches: { platform: string; typed: string; urlUser: string }[] = [];
  let evaluatedCount = 0;

  for (const profile of input.profiles) {
    if (profile.urlPlatformSupported && profile.extractedUsername && profile.normalisedExtractedUsername) {
      evaluatedCount++;
      if (profile.normalisedTypedUsername !== profile.normalisedExtractedUsername) {
        mismatches.push({
          platform: profile.platform,
          typed: profile.typedUsername,
          urlUser: profile.extractedUsername,
        });
      }
    }
  }

  if (mismatches.length > 0) {
    const m = mismatches[0]!;
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "warn",
      severity: "low",
      evidence: `Username mismatch on ${m.platform}: typed username (${maskUsername(m.typed)}) differs from URL username (${maskUsername(m.urlUser)}).`,
      explanation:
        "The supplied username differs from the username present in the submitted profile URL.",
      recommendation:
        "Verify that the profile URL matches the intended account username.",
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence:
      evaluatedCount > 0
        ? "Supplied profile URLs match their corresponding typed usernames."
        : "No profile URL username mismatches detected.",
    explanation:
      evaluatedCount > 0
        ? "No mismatches were detected between profile URLs and typed usernames."
        : "No profile URL username mismatches were detected among the supplied profiles.",
    triggered: false,
  };
}

/**
 * RULE 4 — PRIV_USERNAME_PERSONAL_HINT
 * Triggered when a supplied username contains a part of the display name (>= 4 chars)
 * or ends in a plausible birth year (1940 to current year).
 */
export function checkUsernamePersonalHint(input: NormalisedPrivacyInput): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_USERNAME_PERSONAL_HINT;
  const currentYear = new Date().getFullYear();
  const yearRegex = /(?:19[4-9]\d|20[0-2]\d)$/;
  const displayNameParts = input.normalisedDisplayNameParts || [];

  for (const profile of input.profiles) {
    // 1. Check display name components (>= 4 chars)
    if (displayNameParts.length > 0) {
      for (const part of displayNameParts) {
        if (profile.normalisedTypedUsername.includes(part)) {
          return {
            code: config.code,
            category: config.category,
            title: config.title,
            outcome: "warn",
            severity: "low",
            evidence: `Supplied username (masked: ${maskUsername(profile.typedUsername)}) contains a display name fragment.`,
            explanation:
              "The supplied username contains information resembling a personal name fragment. This can make usernames easier to link to real-world identities.",
            recommendation:
              "Avoid including personal names in usernames to maintain separation from your real identity.",
            triggered: true,
          };
        }
      }
    }

    // 2. Check plausible birth year suffix (1940 to current year)
    const yearMatch = profile.normalisedTypedUsername.match(yearRegex);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      if (year >= 1940 && year <= currentYear) {
        return {
          code: config.code,
          category: config.category,
          title: config.title,
          outcome: "warn",
          severity: "low",
          evidence: `Supplied username (masked: ${maskUsername(profile.typedUsername)}) ends in a plausible birth year suffix.`,
          explanation:
            "The supplied username contains information resembling a plausible birth year. This can make usernames easier to correlate with public records.",
          recommendation:
            "Avoid appending birth years to usernames to prevent age and identity inference.",
          triggered: true,
        };
      }
    }
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Supplied usernames do not contain detected personal name fragments or birth year patterns.",
    explanation: "No personal name hints or birth years were detected in usernames.",
    triggered: false,
  };
}

/**
 * Extracts and validates unique emails from text.
 */
export function extractValidEmails(text: string): string[] {
  if (!text) return [];
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  const uniqueEmails = new Set<string>();

  for (const match of matches) {
    if (validator.isEmail(match)) {
      uniqueEmails.add(match);
    }
  }

  return Array.from(uniqueEmails);
}

/**
 * RULE 5 — PRIV_EMAIL_FOUND
 * Triggered when an email appears in submittedText and is confirmed by validator.
 */
export function checkEmailFound(
  _input: NormalisedPrivacyInput,
  validEmails: string[]
): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_EMAIL_FOUND;

  if (validEmails.length > 0) {
    const masked = validEmails.map((e) => maskEmail(e)).join(", ");
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "warn",
      severity: "medium",
      evidence: `Detected email: ${masked}`,
      explanation:
        "An email address was found in the submitted text. Publicly sharing email addresses exposes them to spam and correlation across databases.",
      recommendation:
        "Remove email addresses from public text or use disposable alias addresses.",
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No email addresses were detected in the submitted text.",
    explanation: "No email patterns were found in the provided text.",
    triggered: false,
  };
}

/**
 * RULE 6 — PRIV_USERNAME_MATCHES_EMAIL
 * Triggered when a normalized supplied username matches the normalized local part
 * of an email discovered in the supplied text.
 */
export function checkUsernameMatchesEmail(
  input: NormalisedPrivacyInput,
  validEmails: string[]
): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_USERNAME_MATCHES_EMAIL;

  for (const email of validEmails) {
    const atIndex = email.indexOf("@");
    if (atIndex > 0) {
      const localPart = email.slice(0, atIndex);
      const normalisedLocal = normaliseUsername(localPart);

      for (const profile of input.profiles) {
        if (profile.normalisedTypedUsername === normalisedLocal) {
          return {
            code: config.code,
            category: config.category,
            title: config.title,
            outcome: "warn",
            severity: "medium",
            evidence: `Username (masked: ${maskUsername(profile.typedUsername)}) matches local part of email (masked: ${maskEmail(email)}).`,
            explanation:
              "A submitted username matches the local part of an email appearing in the supplied text. This direct correlation makes it easier to connect your public profiles with your contact address.",
            recommendation:
              "Use an email address whose username or alias differs from your public profile handles.",
            triggered: true,
          };
        }
      }
    }
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Supplied usernames do not match the local part of any detected email addresses.",
    explanation: "No correlation was found between usernames and email addresses in the text.",
    triggered: false,
  };
}

/**
 * RULE 7 — PRIV_PHONE_FOUND
 * Triggered when a valid phone number is detected in submitted text using libphonenumber-js.
 * Confirmed payment card spans are excluded from phone number detection.
 */
export function checkPhoneFound(
  input: NormalisedPrivacyInput,
  cardSpans: CardSpan[]
): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_PHONE_FOUND;

  if (input.submittedText) {
    const rawPhones = findPhoneNumbersInText(input.submittedText);
    const validPhones: string[] = [];

    for (const item of rawPhones) {
      // Exclude if span overlaps any confirmed payment card
      const overlapsCard = cardSpans.some(
        (span) => item.startsAt < span.end && item.endsAt > span.start
      );
      if (overlapsCard) {
        continue;
      }

      if (item.number && item.number.isValid()) {
        const rawMatch = input.submittedText.slice(item.startsAt, item.endsAt);
        validPhones.push(rawMatch);
      }
    }

    if (validPhones.length > 0) {
      const masked = validPhones.map((p) => maskPhone(p)).join(", ");
      return {
        code: config.code,
        category: config.category,
        title: config.title,
        outcome: "warn",
        severity: "medium",
        evidence: `Detected phone number: ${masked}`,
        explanation:
          "A valid phone number was detected in the submitted text. Exposed phone numbers can be targeted for smishing, social engineering, and unauthorized account recovery.",
        recommendation:
          "Remove phone numbers from public text and avoid sharing direct contact numbers publicly.",
        triggered: true,
      };
    }
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No phone numbers were detected in the submitted text.",
    explanation: "No phone number patterns were found in the provided text.",
    triggered: false,
  };
}

interface SecretMatch {
  type: string;
  token: string;
}

/**
 * RULE 8 — PRIV_SECRET_FOUND
 * Triggered when an AWS access key, GitHub token, Slack token, Google API key,
 * private key block, or JWT pattern is found in submitted text.
 */
export function checkSecretFound(input: NormalisedPrivacyInput): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_SECRET_FOUND;

  if (input.submittedText) {
    const secrets: SecretMatch[] = [];

    // 1. AWS access key ID: AKIA followed by 16 alphanumeric characters
    const awsRegex = /\b(AKIA[0-9A-Z]{16})\b/g;
    let match: RegExpExecArray | null;
    while ((match = awsRegex.exec(input.submittedText)) !== null) {
      secrets.push({ type: "AWS key", token: match[1]! });
    }

    // 2. GitHub tokens: ghp_, gho_, ghu_, ghs_, ghr_
    const ghRegex = /\b(gh[pousr]_[A-Za-z0-9_]{16,})\b/g;
    while ((match = ghRegex.exec(input.submittedText)) !== null) {
      secrets.push({ type: "GitHub token", token: match[1]! });
    }

    // 3. Slack tokens: xoxb-, xoxp-, xoxa-, xoxr-, xoxs-
    const slackRegex = /\b(xox[baprs]-[0-9A-Za-z-]{10,})\b/g;
    while ((match = slackRegex.exec(input.submittedText)) !== null) {
      secrets.push({ type: "Slack token", token: match[1]! });
    }

    // 4. Google API keys: AIza followed by 20 to 45 characters
    const googleRegex = /\b(AIza[0-9A-Za-z_-]{20,45})\b/g;
    while ((match = googleRegex.exec(input.submittedText)) !== null) {
      secrets.push({ type: "Google API key", token: match[1]! });
    }

    // 5. Private-key blocks
    const privateKeyRegex =
      /(-----BEGIN (?:[A-Z\s]+)?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z\s]+)?PRIVATE KEY-----|BEGIN (?:[A-Z\s]+)?PRIVATE KEY)/g;
    while ((match = privateKeyRegex.exec(input.submittedText)) !== null) {
      secrets.push({ type: "Private key", token: match[1]! });
    }

    // 6. JWT pattern: three base64url segments
    const jwtRegex = /\b(ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g;
    while ((match = jwtRegex.exec(input.submittedText)) !== null) {
      secrets.push({ type: "JWT", token: match[1]! });
    }

    if (secrets.length > 0) {
      const masked = secrets.map((s) => maskToken(s.type, s.token)).join(", ");
      return {
        code: config.code,
        category: config.category,
        title: config.title,
        outcome: "fail",
        severity: "high",
        evidence: `Exposed secret detected: ${masked}`,
        explanation:
          "An exposed secret token or private key was found in the submitted text. Anyone with access to this text could authenticate or impersonate authorized services.",
        recommendation:
          "Immediately revoke and rotate any exposed secret or credential, and remove it from public text or version control.",
        triggered: true,
      };
    }
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No exposed secret credentials detected in the submitted text.",
    explanation: "No known API keys, tokens, private keys, or credential patterns were found in the text.",
    triggered: false,
  };
}

/**
 * RULE 9 — PRIV_CARD_FOUND
 * Triggered when 13 to 19 digits (with optional spaces/dashes) pass the Luhn algorithm.
 */
export function checkCardFound(
  _input: NormalisedPrivacyInput,
  cardSpans: CardSpan[]
): PrivacyFindingResult {
  const config = privacyRuleConfigs.PRIV_CARD_FOUND;

  if (cardSpans.length > 0) {
    const masked = cardSpans.map((c) => maskCard(c.card)).join(", ");
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "fail",
      severity: "high",
      evidence: `Detected payment card: ${masked}`,
      explanation:
        "A valid payment card number passing the Luhn checksum was found in the submitted text.",
      recommendation:
        "Remove payment card numbers immediately and ensure payment details are handled exclusively through PCI-DSS compliant payment gateways.",
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No payment card numbers were detected in the submitted text.",
    explanation: "No payment card numbers passing validation were found in the provided text.",
    triggered: false,
  };
}

/**
 * Runs all nine privacy rules in deterministic order against normalized input.
 */
export function runPrivacyRules(input: NormalisedPrivacyInput): PrivacyFindingResult[] {
  // Pre-calculate extracted entities to allow correlation and mutual exclusion
  const validEmails = input.submittedText ? extractValidEmails(input.submittedText) : [];
  const cardSpans = input.submittedText ? extractValidCardSpans(input.submittedText) : [];

  return [
    checkUsernameReuse(input),
    checkUsernameSimilar(input),
    checkUrlUsernameMismatch(input),
    checkUsernamePersonalHint(input),
    checkEmailFound(input, validEmails),
    checkUsernameMatchesEmail(input, validEmails),
    checkPhoneFound(input, cardSpans),
    checkSecretFound(input),
    checkCardFound(input, cardSpans),
  ];
}
