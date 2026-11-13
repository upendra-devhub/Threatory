import { domainToUnicode } from "node:url";
import { distance } from "fastest-levenshtein";
import { NormalisedUrl } from "./normalise.js";
import {
  coreRuleConfigs,
  advancedRuleConfigs,
  thresholds,
  lists,
  loadTopDomains,
  loadShorteners,
} from "./rules.config.js";

export interface FindingResult {
  code: string;
  category: string;
  title: string;
  outcome: "pass" | "warn" | "fail" | "not_assessed";
  severity: "info" | "low" | "medium" | "high";
  evidence: string;
  explanation: string;
  recommendation?: string;
  weight: number;
  triggered: boolean;
}

/**
 * Computes Shannon entropy in bits per character.
 */
export function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;
  const counts: Record<string, number> = {};
  for (const ch of str) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(counts)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function checkNoHttps(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_NO_HTTPS;
  const triggered = normalised.scheme === "http";

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: "URL uses unencrypted HTTP scheme",
      explanation:
        "HTTP does not encrypt network traffic, leaving credentials and data vulnerable to interception or tampering.",
      recommendation:
        "Avoid submitting credentials or sensitive information over unencrypted HTTP connections.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "URL uses HTTPS scheme",
    explanation: "HTTPS encrypts communications between client and server.",
    weight: 0,
    triggered: false,
  };
}

function checkIpHost(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_IP_HOST;
  const triggered = normalised.isIpHost;

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Host '${normalised.host}' is an IP address literal`,
      explanation:
        "Phishing links frequently use direct IP addresses to evade domain-based reputation tracking and certificate transparency.",
      recommendation:
        "Do not visit or authenticate on sites identified only by an IP address unless you explicitly trust the host.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Host is a domain name rather than an IP literal",
    explanation: "Standard web destinations use registered domain names.",
    weight: 0,
    triggered: false,
  };
}

function checkUserinfo(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_USERINFO;

  let triggered = false;
  try {
    const parsed = new URL(normalised.original);
    triggered = Boolean(parsed.username || parsed.password);
  } catch {
    const match = normalised.original.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]+)/);
    triggered = Boolean(match && match[1]?.includes("@"));
  }

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: "URL contains embedded userinfo before the host",
      explanation:
        "Credentials or misleading brand names embedded before '@' are commonly used to deceive users about the true destination host.",
      recommendation:
        "Do not open links with embedded userinfo; verify the actual domain following the '@' delimiter.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No user credentials embedded before host",
    explanation: "URL does not contain embedded userinfo credentials.",
    weight: 0,
    triggered: false,
  };
}

function checkEncoded(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_ENCODED;

  const hasDoubleEncoding = /%25/i.test(normalised.original);
  const urlWithoutQuery = normalised.original.split(/[?#]/)[0] ?? "";
  const hasEncodedDelimiters = /%(2e|2f|5c)/i.test(urlWithoutQuery);

  const triggered = hasDoubleEncoding || hasEncodedDelimiters;

  if (triggered) {
    const reason = hasDoubleEncoding
      ? "URL contains double percent-encoding (%25)"
      : "URL contains encoded path delimiters (%2E, %2F, or %5C)";
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: reason,
      explanation:
        "Double encoding (%25) or encoded dots and slashes are often used to bypass security filters or obfuscate path traversal.",
      recommendation:
        "Inspect the decoded destination path carefully to verify it leads to the expected resource.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No suspicious percent-encoding anomalies detected",
    explanation:
      "URL does not contain double encoding or obfuscated delimiters in the host or path.",
    weight: 0,
    triggered: false,
  };
}

function looksLikeUrl(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    return true;
  }
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.startsWith("http://") ||
      decoded.startsWith("https://") ||
      decoded.startsWith("//")
    ) {
      return true;
    }
  } catch {
    // Ignore URI malformed errors from decodeURIComponent
  }
  return false;
}

function checkRedirectParam(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_REDIRECT_PARAM;

  const searchParams = new URLSearchParams(normalised.query);
  let matchedKey: string | null = null;
  let matchedValue: string | null = null;

  for (const [key, value] of searchParams.entries()) {
    if (lists.redirectParamNames.includes(key.toLowerCase())) {
      if (looksLikeUrl(value)) {
        matchedKey = key;
        matchedValue = value;
        break;
      }
    }
  }

  const triggered = matchedKey !== null;

  if (triggered && matchedKey && matchedValue) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Query parameter '${matchedKey}' contains a target URL value`,
      explanation:
        "Open redirect parameters can be exploited to bounce users from a trusted origin to a malicious external site.",
      recommendation:
        "Verify that any redirection destination is an expected and legitimate domain before proceeding.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No open-redirect query parameters detected",
    explanation:
      "Query string does not contain suspicious redirect parameters pointing to external URLs.",
    weight: 0,
    triggered: false,
  };
}

function checkHighEntropy(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_HIGH_ENTROPY;

  if (normalised.isIpHost) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "pass",
      severity: "info",
      evidence: "Host is an IP literal; high-entropy rule not applied",
      explanation:
        "Shannon entropy evaluation applies to domain names, not IP host literals.",
      weight: 0,
      triggered: false,
    };
  }

  const labels = normalised.host.split(".");
  const sortedLabels = [...labels].sort((a, b) => b.length - a.length);
  const longestLabel = sortedLabels[0] ?? "";

  const entropy = shannonEntropy(longestLabel);
  const triggered =
    longestLabel.length >= thresholds.entropyMinLength &&
    entropy >= thresholds.entropyThreshold;

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Host label '${longestLabel}' has length ${longestLabel.length} and entropy ${entropy.toFixed(2)} bits/char (threshold: ${thresholds.entropyThreshold})`,
      explanation:
        "High entropy host labels often indicate algorithmically generated domains (DGA) used in malware or disposable phishing infrastructure.",
      recommendation:
        "Verify that the domain name is reputable and not an auto-generated disposable host.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Host labels exhibit normal entropy patterns",
    explanation:
      "Host labels do not exhibit high randomness characteristic of algorithmic domain generation.",
    weight: 0,
    triggered: false,
  };
}

function checkAbusedTld(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_ABUSED_TLD;

  if (normalised.isIpHost) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "pass",
      severity: "info",
      evidence: "Host is an IP address; TLD abuse rule does not apply",
      explanation: "IP address literals do not use top-level domains.",
      weight: 0,
      triggered: false,
    };
  }

  const parts = normalised.host.split(".");
  const lastLabel = parts.length > 1 ? (parts[parts.length - 1]?.toLowerCase() ?? "") : "";
  const triggered = lists.abusedTlds.includes(lastLabel);

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Domain uses high-abuse top-level domain '.${lastLabel}'`,
      explanation:
        "This top-level domain is statistically associated with elevated volumes of spam and phishing campaigns.",
      recommendation:
        "Treat links with this domain extension with extra scrutiny.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Top-level domain is not on the high-abuse watch list",
    explanation:
      "The domain extension is not among frequently abused top-level domains.",
    weight: 0,
    triggered: false,
  };
}

function checkExcessSubdomains(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_EXCESS_SUBDOMAINS;
  const count = normalised.subdomainLabels.length;
  const triggered = count > thresholds.maxSubdomains;

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Host contains ${count} subdomain labels (threshold: ${thresholds.maxSubdomains})`,
      explanation:
        "Excessive subdomain levels are often used to mimic complex enterprise domain structures or bypass detection.",
      recommendation:
        "Check the registrable root domain rather than the prefixed subdomain labels.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: `${count} subdomain label(s) present (threshold: ${thresholds.maxSubdomains})`,
    explanation: "Subdomain hierarchy depth is within normal bounds.",
    weight: 0,
    triggered: false,
  };
}

function checkNonstandardPort(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_NONSTANDARD_PORT;
  const standardPort = normalised.scheme === "https" ? 443 : 80;
  const triggered =
    normalised.port !== null && normalised.port !== standardPort;

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Non-standard port ${normalised.port} specified for ${normalised.scheme.toUpperCase()}`,
      explanation:
        "Legitimate websites typically serve traffic on standard HTTP (80) or HTTPS (443) ports; custom ports may bypass proxies or indicate ad-hoc servers.",
      recommendation:
        "Ensure you recognize the service running on this non-standard port.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Standard network port used",
    explanation: "Connection uses standard protocol port.",
    weight: 0,
    triggered: false,
  };
}

function checkKeywords(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_KEYWORDS;

  const hostLower = normalised.host.toLowerCase();
  const pathLower = normalised.path.toLowerCase();

  let matchedKeyword: string | null = null;
  let location: "host" | "path" = "host";

  for (const kw of lists.sensitiveKeywords) {
    if (hostLower.includes(kw)) {
      matchedKeyword = kw;
      location = "host";
      break;
    }
    if (pathLower.includes(kw)) {
      matchedKeyword = kw;
      location = "path";
      break;
    }
  }

  const triggered = matchedKeyword !== null;

  if (triggered && matchedKeyword) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `${location === "host" ? "Host" : "Path"} contains '${matchedKeyword}'`,
      explanation: `Keyword ${matchedKeyword} is commonly targeted by phishing campaigns`,
      recommendation:
        "Verify domain authenticity before entering credentials or sensitive data",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No targeted credential or security keywords detected",
    explanation:
      "Host and path do not contain common sensitive keywords.",
    weight: 0,
    triggered: false,
  };
}

function checkLongUrl(normalised: NormalisedUrl): FindingResult {
  const config = coreRuleConfigs.URL_LONG;
  const len = normalised.original.length;
  const triggered = len > thresholds.maxUrlLength;

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `URL length is ${len} characters (threshold: ${thresholds.maxUrlLength})`,
      explanation:
        "Excessively long URLs are often used to obscure malicious domains or parameters in the browser address bar.",
      recommendation:
        "Examine the full destination URL to confirm all components are expected.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: `URL length is ${len} characters (within ${thresholds.maxUrlLength}-character threshold)`,
    explanation: "URL length is within standard concise limits.",
    weight: 0,
    triggered: false,
  };
}

/**
 * Runs all 11 core URL rules deterministically.
 */
export function runCoreRules(normalised: NormalisedUrl): FindingResult[] {
  return [
    checkNoHttps(normalised),
    checkIpHost(normalised),
    checkUserinfo(normalised),
    checkEncoded(normalised),
    checkRedirectParam(normalised),
    checkHighEntropy(normalised),
    checkAbusedTld(normalised),
    checkExcessSubdomains(normalised),
    checkNonstandardPort(normalised),
    checkKeywords(normalised),
    checkLongUrl(normalised),
  ];
}

export function checkLookalike(
  normalised: NormalisedUrl,
  customTopDomains?: string[]
): FindingResult {
  const config = advancedRuleConfigs.URL_LOOKALIKE;

  if (normalised.isIpHost || !normalised.registrableDomain) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "pass",
      severity: "info",
      evidence: "Host is not a registrable domain susceptible to lookalike typosquatting",
      explanation: "Typosquatting analysis applies to registered domain names.",
      weight: 0,
      triggered: false,
    };
  }

  const { list: topDomainsList, set: topDomainsSet } = loadTopDomains();
  const domainsList = customTopDomains || topDomainsList;
  const domainSet = customTopDomains ? new Set(customTopDomains) : topDomainsSet;

  const targetDomain = normalised.registrableDomain.toLowerCase();

  // If the domain is an exact match in the top domains list, it is legitimate
  if (domainSet.has(targetDomain)) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "pass",
      severity: "info",
      evidence: `Registrable domain '${targetDomain}' is an authoritative top-ranked domain`,
      explanation: "Domain matches an authoritative top-ranked domain entry.",
      weight: 0,
      triggered: false,
    };
  }

  // Names under 5 characters use distance 1, otherwise distance 1 or 2
  const maxAllowedDist = targetDomain.length < 5 ? 1 : 2;

  let matchedDomain: string | null = null;
  let minDistance = 999;

  for (const refDomain of domainsList) {
    if (Math.abs(refDomain.length - targetDomain.length) > maxAllowedDist) {
      continue;
    }
    const d = distance(targetDomain, refDomain);
    if (d > 0 && d <= maxAllowedDist) {
      matchedDomain = refDomain;
      minDistance = d;
      break;
    }
  }

  if (matchedDomain) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Registrable domain '${targetDomain}' is within edit distance ${minDistance} of top domain '${matchedDomain}'`,
      explanation:
        "Attackers register lookalike domains closely resembling well-known websites to deceive victims into entering credentials.",
      recommendation:
        "Verify domain spelling and navigate using known bookmarks or official search rather than following unsolicited links.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: `Registrable domain '${targetDomain}' does not resemble any top-ranked domains within edit distance ${maxAllowedDist}`,
    explanation: "Domain does not closely match top-ranked reference domains.",
    weight: 0,
    triggered: false,
  };
}

export function checkHomograph(normalised: NormalisedUrl): FindingResult {
  const config = advancedRuleConfigs.URL_HOMOGRAPH;

  if (normalised.isIpHost) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "pass",
      severity: "info",
      evidence: "IP destination literal; homograph analysis not applicable",
      explanation: "Homograph analysis applies to domain name labels.",
      weight: 0,
      triggered: false,
    };
  }

  const rawLabels = normalised.host.toLowerCase().split(".");
  let punycodeLabel: string | null = null;
  let mixedScriptLabel: string | null = null;
  let detectedScripts: string[] = [];

  const scriptRegexes: { name: string; regex: RegExp }[] = [
    { name: "Latin", regex: /\p{Script=Latin}/u },
    { name: "Cyrillic", regex: /\p{Script=Cyrillic}/u },
    { name: "Greek", regex: /\p{Script=Greek}/u },
    { name: "Hebrew", regex: /\p{Script=Hebrew}/u },
    { name: "Arabic", regex: /\p{Script=Arabic}/u },
    { name: "Devanagari", regex: /\p{Script=Devanagari}/u },
    { name: "Han", regex: /\p{Script=Han}/u },
    { name: "Hiragana", regex: /\p{Script=Hiragana}/u },
    { name: "Katakana", regex: /\p{Script=Katakana}/u },
    { name: "Hangul", regex: /\p{Script=Hangul}/u },
  ];

  for (const label of rawLabels) {
    if (label.startsWith("xn--")) {
      punycodeLabel = label;
      break;
    }

    const unicodeLabel = domainToUnicode(label);
    const scriptsFound = scriptRegexes
      .filter((s) => s.regex.test(unicodeLabel))
      .map((s) => s.name);

    if (scriptsFound.length > 1) {
      mixedScriptLabel = unicodeLabel;
      detectedScripts = scriptsFound;
      break;
    }
  }

  if (punycodeLabel) {
    const decoded = domainToUnicode(punycodeLabel);
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Host label '${punycodeLabel}' uses punycode encoding (decodes to '${decoded}')`,
      explanation:
        "Punycode encoding is frequently leveraged in Internationalized Domain Name (IDN) homograph attacks to impersonate legitimate domains with visually identical glyphs.",
      recommendation:
        "Avoid entering credentials or sensitive data on punycode-encoded domain names.",
      weight: config.weight,
      triggered: true,
    };
  }

  if (mixedScriptLabel) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Host label '${mixedScriptLabel}' mixes multiple Unicode scripts (${detectedScripts.join(", ")})`,
      explanation:
        "Mixing characters from different writing systems (such as Latin and Cyrillic) is a classic homograph attack pattern designed to deceive human visual inspection.",
      recommendation:
        "Do not trust domain names combining characters across multiple writing systems.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Host labels use uniform character sets without punycode or mixed scripts",
    explanation: "Domain labels do not exhibit homograph deception indicators.",
    weight: 0,
    triggered: false,
  };
}

export function checkBrandSubdomain(normalised: NormalisedUrl): FindingResult {
  const config = advancedRuleConfigs.URL_BRAND_SUBDOMAIN;

  if (normalised.isIpHost || !normalised.registrableDomain) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: "pass",
      severity: "info",
      evidence: "Host is not a domain with subdomains; brand subdomain analysis not applicable",
      explanation: "Brand subdomain analysis requires registered domain and subdomain hierarchy.",
      weight: 0,
      triggered: false,
    };
  }

  const registrable = normalised.registrableDomain.toLowerCase();
  const subdomains = normalised.subdomainLabels.map((s) => s.toLowerCase());
  const subdomainJoined = subdomains.join(".");

  // Split path into words
  const pathWords = normalised.path
    .toLowerCase()
    .split(/[/._\-~&=?#+]+/)
    .filter((w) => w.length >= 3);

  let matchedBrand: string | null = null;

  for (const brand of lists.targetBrands) {
    // If the registrable domain belongs to or starts with the brand name, it is not unrelated
    if (registrable === brand || registrable.startsWith(`${brand}.`)) {
      continue;
    }

    // Check if brand appears as a subdomain label or in joined subdomain
    const inSubdomain =
      subdomains.includes(brand) ||
      subdomainJoined.includes(`${brand}.`) ||
      subdomainJoined.startsWith(brand) ||
      subdomainJoined.endsWith(brand);

    // Check if brand appears as an isolated path segment or word
    const inPath = pathWords.includes(brand);

    if (inSubdomain || inPath) {
      matchedBrand = brand;
      break;
    }
  }

  if (matchedBrand) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Target brand '${matchedBrand}' appears in subdomain or path of unrelated registrable domain '${registrable}'`,
      explanation:
        "Attackers frequently place well-known brand names into subdomains or paths to mislead users into believing they are visiting an official domain.",
      recommendation:
        `Verify the actual destination domain (${registrable}) rather than trusting brand names in subdomains or URL paths.`,
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No target brand impersonation observed in subdomains or path",
    explanation: "Subdomain labels and path segments do not contain mismatched brand identifiers.",
    weight: 0,
    triggered: false,
  };
}

export function checkShortener(normalised: NormalisedUrl): FindingResult {
  const config = advancedRuleConfigs.URL_SHORTENER;
  const shorteners = loadShorteners();

  const hostLower = normalised.host.toLowerCase();
  const registrableLower = normalised.registrableDomain?.toLowerCase();

  const triggered =
    shorteners.has(hostLower) ||
    (Boolean(registrableLower) && shorteners.has(registrableLower!));

  if (triggered) {
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `Host '${normalised.host}' is a known URL shortening service`,
      explanation:
        "URL shorteners conceal the true destination host and path, frequently used in phishing or spam campaigns to bypass domain reputation filters.",
      recommendation:
        "Expand and verify the destination URL before visiting or entering credentials.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "Host is not a known URL shortening service",
    explanation: "Host is not listed in the URL shortener registry.",
    weight: 0,
    triggered: false,
  };
}

export function checkFeedMatch(
  _normalised: NormalisedUrl,
  feedMatch?: boolean | { match: boolean; source?: string; target?: string }
): FindingResult {
  const config = advancedRuleConfigs.URL_FEED_MATCH;

  const isMatched =
    typeof feedMatch === "boolean"
      ? feedMatch
      : Boolean(feedMatch && feedMatch.match);

  if (isMatched) {
    const details =
      typeof feedMatch === "object" && feedMatch?.source
        ? ` (source: ${feedMatch.source})`
        : "";
    return {
      code: config.code,
      category: config.category,
      title: config.title,
      outcome: config.triggeredOutcome,
      severity: config.triggeredSeverity,
      evidence: `URL or destination host matched malicious threat intelligence feed${details}`,
      explanation:
        "Destination URL or host is actively listed in threat intelligence feeds as confirmed phishing or malware distribution infrastructure.",
      recommendation:
        "Do not navigate to this destination. Block access to this URL across perimeter defenses immediately.",
      weight: config.weight,
      triggered: true,
    };
  }

  return {
    code: config.code,
    category: config.category,
    title: config.title,
    outcome: "pass",
    severity: "info",
    evidence: "No match in locally stored threat intelligence feeds",
    explanation: "URL and host were not found in local threat intelligence feeds.",
    weight: 0,
    triggered: false,
  };
}

export interface RunRulesOptions {
  feedMatch?: boolean | { match: boolean; source?: string; target?: string };
  customTopDomains?: string[];
}

export function runAdvancedRules(
  normalised: NormalisedUrl,
  options?: RunRulesOptions
): FindingResult[] {
  return [
    checkLookalike(normalised, options?.customTopDomains),
    checkHomograph(normalised),
    checkBrandSubdomain(normalised),
    checkShortener(normalised),
    checkFeedMatch(normalised, options?.feedMatch),
  ];
}

export function runAllRules(
  normalised: NormalisedUrl,
  options?: RunRulesOptions
): FindingResult[] {
  return [
    ...runCoreRules(normalised),
    ...runAdvancedRules(normalised, options),
  ];
}
