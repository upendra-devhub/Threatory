import crypto from "node:crypto";
import { Finding, Report, RiskLevel } from "@threatory/contracts";
import {
  AddressPolicy,
  DnsResolver,
  createDefaultResolver,
  defaultAddressPolicy,
  validateTargetUrl,
} from "./ssrf-guard.js";
import { checkDnsAndTls, checkHttpToHttpsAndRedirects, CertificateSummary } from "./tls-checker.js";
import { checkHeadersAndCookies } from "./http-checker.js";
import { checkEmailDns, EmailDnsResolver, createDefaultEmailDnsResolver } from "./dns-checker.js";
import { WEBSITE_RULES } from "./rules.config.js";

export const WEBSITE_RULES_VERSION = "website-1.0.0";
export const CHECK_TIMEOUT_MS = 8000; // 8 seconds per check
export const OVERALL_BUDGET_MS = 25000; // 25 seconds overall budget

export interface AnalyseWebsiteOptions {
  resolver?: DnsResolver;
  emailDnsResolver?: EmailDnsResolver;
  policy?: AddressPolicy;
  checkTimeoutMs?: number;
  overallTimeoutMs?: number;
  customTlsPort?: number;
  customHttpPort?: number;
  customFetchUrl?: string;
  allowCustomPort?: boolean;
}

export interface AnalyseWebsiteResult {
  report: Report;
}

function calculateRiskLevel(findings: Finding[]): { riskLevel: RiskLevel; label: string } {
  const hasFail = findings.some((f) => f.outcome === "fail");
  if (hasFail) {
    return { riskLevel: "high", label: "High risk" };
  }

  const hasMediumWarn = findings.some((f) => f.outcome === "warn" && f.severity === "medium");
  if (hasMediumWarn) {
    return { riskLevel: "medium", label: "Medium risk" };
  }

  const hasLowWarn = findings.some((f) => f.outcome === "warn" && f.severity === "low");
  if (hasLowWarn) {
    return { riskLevel: "low", label: "Low risk" };
  }

  return { riskLevel: "none_detected", label: "No configuration issues observed" };
}

function createFallbackNotAssessedFinding(code: string, reason: string): Finding {
  const rule = WEBSITE_RULES[code];
  return {
    code,
    category: rule ? rule.category : "dns",
    title: rule ? rule.title : code,
    outcome: "not_assessed",
    severity: "info",
    evidence: `Check was not assessed: ${reason}`,
    explanation: rule ? rule.explanation : "Website security check.",
  };
}

/**
 * Runs website security audit checks in parallel using Promise.allSettled:
 * - 8s timeout per check
 * - 25s overall budget
 * - Partial report generated when any check fails or is not assessed
 * - Zero storage of cookies, response bodies, or secrets
 */
export async function analyseWebsite(
  rawUrl: string,
  options: AnalyseWebsiteOptions = {}
): Promise<AnalyseWebsiteResult> {
  const policy = options.policy ?? defaultAddressPolicy;
  const allowCustomPort = options.allowCustomPort ?? false;

  // 1. Validate target URL through SSRF guard (throws 400 or 422 if invalid)
  const targetUrl = validateTargetUrl(rawUrl, policy, allowCustomPort);

  const resolver = options.resolver ?? createDefaultResolver();
  const emailDnsResolver = options.emailDnsResolver ?? createDefaultEmailDnsResolver();
  const checkTimeoutMs = options.checkTimeoutMs ?? CHECK_TIMEOUT_MS;
  const overallTimeoutMs = options.overallTimeoutMs ?? OVERALL_BUDGET_MS;

  // Wrap check execution within overall timeout budget
  const overallController = new AbortController();
  const overallTimer = setTimeout(() => {
    overallController.abort(new Error("Overall scan budget of 25 seconds exceeded"));
  }, overallTimeoutMs);

  try {
    // Run the 4 primary check suites concurrently using Promise.allSettled
    const [tlsResult, redirectResult, httpResult, emailDnsResult] = await Promise.allSettled([
      // Check 1: DNS and TLS Connection
      checkDnsAndTls(targetUrl, {
        resolver,
        policy,
        connectTimeoutMs: checkTimeoutMs,
        customTlsPort: options.customTlsPort,
      }),

      // Check 2: HTTP to HTTPS and Redirects
      checkHttpToHttpsAndRedirects(targetUrl, {
        resolver,
        policy,
        connectTimeoutMs: checkTimeoutMs,
        customHttpPort: options.customHttpPort,
      }),

      // Check 3: HTTP Security Headers and Cookies
      checkHeadersAndCookies(targetUrl, {
        resolver,
        policy,
        connectTimeoutMs: checkTimeoutMs,
        totalTimeoutMs: checkTimeoutMs,
        customUrl: options.customFetchUrl,
        allowCustomPort,
      }),

      // Check 4: Email DNS (SPF, DMARC, CAA)
      checkEmailDns(targetUrl, emailDnsResolver),
    ]);

    const findingsMap = new Map<string, Finding>();
    let certSummary: CertificateSummary | undefined;
    let finalUrl = targetUrl.toString();
    let redirectCount = 0;
    let statusCode: number | undefined;
    let ipAddress: string | undefined;

    // Process Check 1: DNS and TLS
    if (tlsResult.status === "fulfilled") {
      for (const f of tlsResult.value.findings) {
        findingsMap.set(f.code, f);
      }
      certSummary = tlsResult.value.certSummary;
      if (tlsResult.value.resolvedIps && tlsResult.value.resolvedIps.length > 0) {
        ipAddress = tlsResult.value.resolvedIps[0];
      }
    } else {
      const reason = tlsResult.reason?.message || "DNS and TLS check failed";
      for (const code of [
        "SITE_DNS_RESOLVES",
        "SITE_HTTPS_AVAILABLE",
        "SITE_TLS_CERT_VALID",
        "SITE_TLS_EXPIRY",
        "SITE_TLS_PROTOCOL",
      ]) {
        findingsMap.set(code, createFallbackNotAssessedFinding(code, reason));
      }
    }

    // Process Check 2: Redirects
    if (redirectResult.status === "fulfilled") {
      findingsMap.set(
        redirectResult.value.httpToHttpsFinding.code,
        redirectResult.value.httpToHttpsFinding
      );
      findingsMap.set(
        redirectResult.value.redirectsFinding.code,
        redirectResult.value.redirectsFinding
      );
    } else {
      const reason = redirectResult.reason?.message || "Redirect check failed";
      findingsMap.set(
        "SITE_HTTP_TO_HTTPS",
        createFallbackNotAssessedFinding("SITE_HTTP_TO_HTTPS", reason)
      );
      findingsMap.set(
        "SITE_REDIRECTS",
        createFallbackNotAssessedFinding("SITE_REDIRECTS", reason)
      );
    }

    // Process Check 3: HTTP Headers & Cookies
    if (httpResult.status === "fulfilled") {
      for (const f of httpResult.value.headerFindings) {
        findingsMap.set(f.code, f);
      }
      for (const f of httpResult.value.cookieFindings) {
        findingsMap.set(f.code, f);
      }
      finalUrl = httpResult.value.responseMeta.finalUrl;
      statusCode = httpResult.value.responseMeta.statusCode;
      redirectCount = httpResult.value.responseMeta.redirectCount;
      if (httpResult.value.responseMeta.ipAddress) {
        ipAddress = httpResult.value.responseMeta.ipAddress;
      }
    } else {
      const reason = httpResult.reason?.message || "HTTP headers check failed";
      for (const code of [
        "SITE_HSTS",
        "SITE_CSP",
        "SITE_XCTO",
        "SITE_FRAMING",
        "SITE_REFERRER_POLICY",
        "SITE_PERMISSIONS_POLICY",
        "SITE_VERSION_DISCLOSURE",
        "SITE_COOKIE_SECURE",
        "SITE_COOKIE_HTTPONLY",
        "SITE_COOKIE_SAMESITE",
      ]) {
        findingsMap.set(code, createFallbackNotAssessedFinding(code, reason));
      }
    }

    // Process Check 4: Email DNS
    if (emailDnsResult.status === "fulfilled") {
      for (const f of emailDnsResult.value.findings) {
        findingsMap.set(f.code, f);
      }
    } else {
      const reason = emailDnsResult.reason?.message || "Email DNS check failed";
      for (const code of ["SITE_SPF", "SITE_DMARC", "SITE_CAA"]) {
        findingsMap.set(code, createFallbackNotAssessedFinding(code, reason));
      }
    }

    // Assemble all 20 findings in canonical order
    const canonicalOrder = [
      "SITE_DNS_RESOLVES",
      "SITE_HTTPS_AVAILABLE",
      "SITE_TLS_CERT_VALID",
      "SITE_TLS_EXPIRY",
      "SITE_TLS_PROTOCOL",
      "SITE_HTTP_TO_HTTPS",
      "SITE_REDIRECTS",
      "SITE_HSTS",
      "SITE_CSP",
      "SITE_XCTO",
      "SITE_FRAMING",
      "SITE_REFERRER_POLICY",
      "SITE_PERMISSIONS_POLICY",
      "SITE_VERSION_DISCLOSURE",
      "SITE_COOKIE_SECURE",
      "SITE_COOKIE_HTTPONLY",
      "SITE_COOKIE_SAMESITE",
      "SITE_SPF",
      "SITE_DMARC",
      "SITE_CAA",
    ];

    const findings: Finding[] = canonicalOrder.map((code) => {
      const existing = findingsMap.get(code);
      if (existing) return existing;
      return createFallbackNotAssessedFinding(code, "Check could not be completed");
    });

    // Report status: 'partial' if ANY finding is not_assessed, else 'completed'
    const hasNotAssessed = findings.some((f) => f.outcome === "not_assessed");
    const status: "completed" | "partial" = hasNotAssessed ? "partial" : "completed";

    const { riskLevel, label } = calculateRiskLevel(findings);

    const limitations: string[] = [
      "This audit is a passive security review, not an intrusive penetration test.",
      "Only public DNS records and the landing page response were inspected.",
      "Pages behind authentication, secondary endpoints, and deep application routes were not assessed.",
      "No exploitation, fuzzing, or vulnerability payloads were transmitted.",
    ];

    if (status === "partial") {
      const unassessedCodes = findings
        .filter((f) => f.outcome === "not_assessed")
        .map((f) => f.code);
      limitations.unshift(
        `Some security checks could not complete and were marked not assessed: ${unassessedCodes.join(", ")}`
      );
    }

    // Details structure: certificate summary, final URL, redirect count, IP address
    // Invariant: NEVER include cookie values or response bodies
    const details: Record<string, unknown> = {
      finalUrl,
      statusCode: statusCode || 200,
      redirectCount,
      ipAddress: ipAddress || "unknown",
    };

    if (certSummary) {
      details.certificate = {
        subject: certSummary.subject,
        issuer: certSummary.issuer,
        validFrom: certSummary.validFrom,
        validTo: certSummary.validTo,
        protocol: certSummary.protocol,
        daysRemaining: certSummary.daysRemaining,
        authorized: certSummary.authorized,
        authorizationError: certSummary.authorizationError,
      };
    }

    const report: Report = {
      scanId: `scan-web-${crypto.randomUUID()}`,
      module: "website",
      status,
      rulesVersion: WEBSITE_RULES_VERSION,
      targetSummary: targetUrl.toString(),
      assessment: {
        label,
        riskLevel,
      },
      findings,
      limitations,
      details,
      createdAt: new Date().toISOString(),
    };

    return { report };
  } finally {
    clearTimeout(overallTimer);
  }
}
