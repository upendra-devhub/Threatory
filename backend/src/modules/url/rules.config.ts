export const rulesVersion = "url-1.0.0";

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
};
