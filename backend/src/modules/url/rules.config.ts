import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rulesVersion = "url-1.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuleConfig {
  code: string;
  category: string;
  title: string;
  weight: number;
  triggeredSeverity: "low" | "medium" | "high";
  triggeredOutcome: "warn" | "fail";
}

export type CoreRuleCode =
  | "URL_NO_HTTPS"
  | "URL_IP_HOST"
  | "URL_USERINFO"
  | "URL_ENCODED"
  | "URL_REDIRECT_PARAM"
  | "URL_HIGH_ENTROPY"
  | "URL_ABUSED_TLD"
  | "URL_EXCESS_SUBDOMAINS"
  | "URL_NONSTANDARD_PORT"
  | "URL_KEYWORDS"
  | "URL_LONG";

export type AdvancedRuleCode =
  | "URL_LOOKALIKE"
  | "URL_HOMOGRAPH"
  | "URL_BRAND_SUBDOMAIN"
  | "URL_SHORTENER"
  | "URL_FEED_MATCH";

export type RuleCode = CoreRuleCode | AdvancedRuleCode;

export interface CoreRuleConfigs {
  URL_NO_HTTPS: RuleConfig;
  URL_IP_HOST: RuleConfig;
  URL_USERINFO: RuleConfig;
  URL_ENCODED: RuleConfig;
  URL_REDIRECT_PARAM: RuleConfig;
  URL_HIGH_ENTROPY: RuleConfig;
  URL_ABUSED_TLD: RuleConfig;
  URL_EXCESS_SUBDOMAINS: RuleConfig;
  URL_NONSTANDARD_PORT: RuleConfig;
  URL_KEYWORDS: RuleConfig;
  URL_LONG: RuleConfig;
}

export interface AdvancedRuleConfigs {
  URL_LOOKALIKE: RuleConfig;
  URL_HOMOGRAPH: RuleConfig;
  URL_BRAND_SUBDOMAIN: RuleConfig;
  URL_SHORTENER: RuleConfig;
  URL_FEED_MATCH: RuleConfig;
}

export const coreRuleConfigs: CoreRuleConfigs = {
  URL_NO_HTTPS: {
    code: "URL_NO_HTTPS",
    category: "host",
    title: "HTTPS protocol enforcement",
    weight: 15,
    triggeredSeverity: "medium",
    triggeredOutcome: "warn",
  },
  URL_IP_HOST: {
    code: "URL_IP_HOST",
    category: "host",
    title: "IP literal destination host",
    weight: 30,
    triggeredSeverity: "high",
    triggeredOutcome: "fail",
  },
  URL_USERINFO: {
    code: "URL_USERINFO",
    category: "host",
    title: "Embedded user credentials",
    weight: 25,
    triggeredSeverity: "high",
    triggeredOutcome: "fail",
  },
  URL_ENCODED: {
    code: "URL_ENCODED",
    category: "host",
    title: "Percent-encoding obfuscation",
    weight: 10,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  URL_REDIRECT_PARAM: {
    code: "URL_REDIRECT_PARAM",
    category: "host",
    title: "Open redirect parameter",
    weight: 10,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  URL_HIGH_ENTROPY: {
    code: "URL_HIGH_ENTROPY",
    category: "host",
    title: "High-entropy host label",
    weight: 10,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  URL_ABUSED_TLD: {
    code: "URL_ABUSED_TLD",
    category: "host",
    title: "High-abuse top-level domain",
    weight: 8,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  URL_EXCESS_SUBDOMAINS: {
    code: "URL_EXCESS_SUBDOMAINS",
    category: "host",
    title: "Excessive subdomain hierarchy",
    weight: 8,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  URL_NONSTANDARD_PORT: {
    code: "URL_NONSTANDARD_PORT",
    category: "host",
    title: "Non-standard network port",
    weight: 8,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  URL_KEYWORDS: {
    code: "URL_KEYWORDS",
    category: "host",
    title: "Sensitive targeted keyword",
    weight: 5,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  URL_LONG: {
    code: "URL_LONG",
    category: "host",
    title: "Excessive URL length",
    weight: 5,
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
};

export const advancedRuleConfigs: AdvancedRuleConfigs = {
  URL_LOOKALIKE: {
    code: "URL_LOOKALIKE",
    category: "host",
    title: "Lookalike or typosquatting domain",
    weight: 30,
    triggeredSeverity: "high",
    triggeredOutcome: "fail",
  },
  URL_HOMOGRAPH: {
    code: "URL_HOMOGRAPH",
    category: "host",
    title: "Homograph or punycode label",
    weight: 30,
    triggeredSeverity: "high",
    triggeredOutcome: "fail",
  },
  URL_BRAND_SUBDOMAIN: {
    code: "URL_BRAND_SUBDOMAIN",
    category: "host",
    title: "Target brand in subdomain or path",
    weight: 25,
    triggeredSeverity: "medium",
    triggeredOutcome: "warn",
  },
  URL_SHORTENER: {
    code: "URL_SHORTENER",
    category: "host",
    title: "URL shortening service",
    weight: 15,
    triggeredSeverity: "medium",
    triggeredOutcome: "warn",
  },
  URL_FEED_MATCH: {
    code: "URL_FEED_MATCH",
    category: "host",
    title: "Local threat intelligence feed match",
    weight: 100,
    triggeredSeverity: "high",
    triggeredOutcome: "fail",
  },
};

export const thresholds = {
  maxSubdomains: 3,
  maxUrlLength: 100,
  entropyMinLength: 12,
  entropyThreshold: 3.5,
  maxScore: 100,
  scoreBrackets: {
    noneDetectedMax: 14,
    lowMax: 39,
    mediumMax: 69,
  },
};

export const lists = {
  abusedTlds: [
    "zip",
    "mov",
    "top",
    "xyz",
    "click",
    "gq",
    "tk",
    "ml",
    "cf",
    "ga",
  ],
  redirectParamNames: [
    "url",
    "redirect",
    "redirect_uri",
    "next",
    "return",
    "returnurl",
    "goto",
    "dest",
    "continue",
    "target",
  ],
  sensitiveKeywords: [
    "login",
    "signin",
    "verify",
    "account",
    "update",
    "secure",
    "banking",
    "password",
    "wallet",
    "confirm",
  ],
  targetBrands: [
    "paypal",
    "google",
    "apple",
    "microsoft",
    "amazon",
    "facebook",
    "netflix",
    "instagram",
    "whatsapp",
    "twitter",
    "linkedin",
    "github",
    "dropbox",
    "chase",
    "wellsfargo",
    "bankofamerica",
    "binance",
    "coinbase",
  ],
};

function resolveDataFilePath(filename: string): string {
  const possiblePaths = [
    path.resolve(__dirname, "../../../data", filename),
    path.resolve(__dirname, "../../data", filename),
    path.resolve(process.cwd(), "backend/data", filename),
    path.resolve(process.cwd(), "data", filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return possiblePaths[0]!;
}

let cachedTopDomains: string[] | null = null;
let cachedTopDomainsSet: Set<string> | null = null;
let cachedShortenersSet: Set<string> | null = null;

export function loadTopDomains(): { list: string[]; set: Set<string> } {
  if (cachedTopDomains && cachedTopDomainsSet) {
    return { list: cachedTopDomains, set: cachedTopDomainsSet };
  }

  const filePath = resolveDataFilePath("top-domains.txt");
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    const domains = content
      .split(/\r?\n/)
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    cachedTopDomains = domains;
    cachedTopDomainsSet = new Set(domains);
  } else {
    // Fallback minimal top domains if file not present
    cachedTopDomains = ["paypal.com", "google.com", "apple.com", "microsoft.com", "amazon.com"];
    cachedTopDomainsSet = new Set(cachedTopDomains);
  }

  return { list: cachedTopDomains, set: cachedTopDomainsSet };
}

export function loadShorteners(): Set<string> {
  if (cachedShortenersSet) {
    return cachedShortenersSet;
  }

  const filePath = resolveDataFilePath("shorteners.txt");
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    const shorteners = content
      .split(/\r?\n/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    cachedShortenersSet = new Set(shorteners);
  } else {
    cachedShortenersSet = new Set([
      "bit.ly",
      "t.co",
      "tinyurl.com",
      "goo.gl",
      "ow.ly",
      "is.gd",
    ]);
  }

  return cachedShortenersSet;
}
