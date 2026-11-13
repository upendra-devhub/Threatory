import { PrivacyScanRequest } from "@threatory/contracts";
import { AppError } from "../../middleware/errors.js";

export interface NormalisedProfile {
  originalIndex: number;
  platform: string;
  typedUsername: string;
  normalisedTypedUsername: string;
  profileUrl?: string;
  extractedUsername?: string;
  normalisedExtractedUsername?: string;
  urlPlatformSupported: boolean;
}

export interface NormalisedPrivacyInput {
  profiles: NormalisedProfile[];
  displayName?: string;
  normalisedDisplayNameParts?: string[];
  submittedText?: string;
  consent: true;
}

/**
 * Normalises username per Appendix B2:
 * 1. Convert to lowercase
 * 2. Remove '.', '_', and '-'
 */
export function normaliseUsername(username: string): string {
  return username.toLowerCase().replace(/[._-]/g, "");
}

/**
 * Normalises a platform string for consistent matching (e.g. "X" vs "Twitter").
 */
export function normalisePlatform(platform: string): string {
  const p = platform.trim().toLowerCase();
  if (p === "x" || p === "twitter") return "x_twitter";
  return p;
}

interface ParsedUrlResult {
  extractedUsername?: string;
  platformSupported: boolean;
}

/**
 * Parses profile URLs locally without network access.
 * Supports patterns:
 * - GitHub: https://github.com/{username}
 * - X / Twitter: https://x.com/{username} or https://twitter.com/{username}
 * - Instagram: https://instagram.com/{username}
 * - LinkedIn: https://linkedin.com/in/{username}
 * - Reddit: https://reddit.com/user/{username}
 */
export function parseProfileUrl(
  rawUrl: string,
  platform: string,
  fieldPath: string
): ParsedUrlResult {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid profile URL format", [
      { path: fieldPath, message: "Invalid URL format" },
    ]);
  }

  // Reject unsupported schemes
  const scheme = parsedUrl.protocol.toLowerCase();
  if (scheme !== "http:" && scheme !== "https:") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Unsupported profile URL scheme (only http and https are supported)",
      [{ path: fieldPath, message: "Unsupported URL scheme" }]
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const normPlatform = normalisePlatform(platform);

  // Platform host mapping
  const platformHosts: Record<string, string[]> = {
    github: ["github.com"],
    x_twitter: ["x.com", "twitter.com"],
    instagram: ["instagram.com"],
    linkedin: ["linkedin.com"],
    reddit: ["reddit.com"],
  };

  const expectedHosts = platformHosts[normPlatform];

  // If the platform is supported, validate that the host matches the platform
  if (expectedHosts) {
    const isMatchingHost = expectedHosts.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );

    if (!isMatchingHost) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Profile URL host does not match declared platform '${platform}'`,
        [{ path: fieldPath, message: `URL host does not match platform '${platform}'` }]
      );
    }

    // Extract username from path
    const pathSegments = parsedUrl.pathname
      .split("/")
      .filter((segment) => segment.length > 0);

    let extracted: string | undefined;

    switch (normPlatform) {
      case "github":
      case "x_twitter":
      case "instagram": {
        // e.g. /username
        if (pathSegments.length >= 1 && pathSegments[0]) {
          extracted = decodeURIComponent(pathSegments[0]);
        }
        break;
      }
      case "linkedin": {
        // e.g. /in/username
        if (pathSegments.length >= 2 && pathSegments[0]?.toLowerCase() === "in" && pathSegments[1]) {
          extracted = decodeURIComponent(pathSegments[1]);
        }
        break;
      }
      case "reddit": {
        // e.g. /user/username or /u/username
        if (
          pathSegments.length >= 2 &&
          (pathSegments[0]?.toLowerCase() === "user" || pathSegments[0]?.toLowerCase() === "u") &&
          pathSegments[1]
        ) {
          extracted = decodeURIComponent(pathSegments[1]);
        }
        break;
      }
    }

    return {
      extractedUsername: extracted,
      platformSupported: true,
    };
  }

  // Unsupported platform but valid URL
  return {
    platformSupported: false,
  };
}

/**
 * Normalises display name into parts with length >= 4 characters.
 */
export function extractDisplayNameParts(displayName?: string): string[] {
  if (!displayName || displayName.trim().length === 0) {
    return [];
  }

  return displayName
    .toLowerCase()
    .split(/[\s,._-]+/)
    .map((part) => part.replace(/[^a-z0-9]/g, ""))
    .filter((part) => part.length >= 4);
}

/**
 * Validates and normalises a PrivacyScanRequest payload.
 */
export function normalisePrivacyInput(rawInput: unknown): NormalisedPrivacyInput {
  // 1. Consent validation
  if (typeof rawInput !== "object" || rawInput === null) {
    throw new AppError("VALIDATION_ERROR", "Invalid request body", [
      { path: "request", message: "Request body must be an object" },
    ]);
  }

  const rawObj = rawInput as Record<string, unknown>;

  if (rawObj.consent !== true) {
    throw new AppError("VALIDATION_ERROR", "Explicit user consent is required", [
      { path: "consent", message: "Consent is required and must be true" },
    ]);
  }

  // 2. Validate with Zod schema
  const parsed = PrivacyScanRequest.safeParse(rawInput);
  if (!parsed.success) {
    const fields = parsed.error.errors.map((err) => ({
      path: err.path.join(".") || "privacy",
      message: err.message,
    }));
    throw new AppError("VALIDATION_ERROR", "Validation failed", fields);
  }

  const data = parsed.data;

  // 3. Normalise profiles and parse profile URLs
  const normalisedProfiles: NormalisedProfile[] = data.profiles.map((p, index) => {
    const normTyped = normaliseUsername(p.username);

    let extracted: string | undefined;
    let normExtracted: string | undefined;
    let urlSupported = false;

    if (p.url && p.url.trim().length > 0) {
      const fieldPath = `profiles.${index}.url`;
      const urlResult = parseProfileUrl(p.url, p.platform, fieldPath);
      extracted = urlResult.extractedUsername;
      urlSupported = urlResult.platformSupported;
      if (extracted) {
        normExtracted = normaliseUsername(extracted);
      }
    }

    return {
      originalIndex: index,
      platform: p.platform,
      typedUsername: p.username,
      normalisedTypedUsername: normTyped,
      profileUrl: p.url,
      extractedUsername: extracted,
      normalisedExtractedUsername: normExtracted,
      urlPlatformSupported: urlSupported,
    };
  });

  // 4. Normalise display name parts
  const displayNameParts = extractDisplayNameParts(data.displayName);

  return {
    profiles: normalisedProfiles,
    displayName: data.displayName,
    normalisedDisplayNameParts: displayNameParts,
    submittedText: data.submittedText,
    consent: true,
  };
}
