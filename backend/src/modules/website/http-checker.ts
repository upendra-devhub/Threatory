import setCookieParser from "set-cookie-parser";
import { Finding } from "@threatory/contracts";
import {
  AddressPolicy,
  DnsResolver,
  createDefaultResolver,
  defaultAddressPolicy,
  guardedFetch,
  GuardedFetchResponse,
} from "./ssrf-guard.js";
import { WEBSITE_RULES } from "./rules.config.js";

export interface HttpAndCookieCheckResults {
  headerFindings: Finding[];
  cookieFindings: Finding[];
  responseMeta: {
    finalUrl: string;
    statusCode: number;
    redirectCount: number;
    ipAddress?: string;
  };
}

function createFinding(
  code: string,
  outcome: "pass" | "warn" | "fail" | "not_assessed",
  severity: "info" | "low" | "medium" | "high",
  evidence: string,
  customRecommendation?: string
): Finding {
  const rule = WEBSITE_RULES[code];
  const finding: Finding = {
    code,
    category: rule ? rule.category : "headers",
    title: rule ? rule.title : code,
    outcome,
    severity,
    evidence,
    explanation: rule ? rule.explanation : "Website security check.",
  };

  if (outcome === "warn" || outcome === "fail") {
    finding.recommendation =
      customRecommendation || (rule ? rule.defaultRecommendation : "Address this security issue.");
  }

  return finding;
}

function getHeaderValue(
  headers: Record<string, string | string[]>,
  name: string
): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      if (Array.isArray(val)) {
        return val.join(", ");
      }
      return val;
    }
  }
  return undefined;
}

/**
 * Evaluates HTTP security headers and cookies from an HTTPS response.
 * Uses HEAD first, falling back to GET if HEAD returns 405 Method Not Allowed or 501 Not Implemented.
 */
export async function checkHeadersAndCookies(
  targetUrl: URL,
  options: {
    resolver?: DnsResolver;
    policy?: AddressPolicy;
    connectTimeoutMs?: number;
    totalTimeoutMs?: number;
    customUrl?: string; // Allows test server URLs
    allowCustomPort?: boolean;
  } = {}
): Promise<HttpAndCookieCheckResults> {
  const resolver = options.resolver ?? createDefaultResolver();
  const policy = options.policy ?? defaultAddressPolicy;
  const connectTimeoutMs = options.connectTimeoutMs;
  const totalTimeoutMs = options.totalTimeoutMs;
  const allowCustomPort = options.allowCustomPort ?? false;
  const requestUrl = options.customUrl ?? targetUrl.toString();

  let response: GuardedFetchResponse;

  try {
    // Attempt HEAD request first
    let res = await guardedFetch(requestUrl, {
      method: "HEAD",
      resolver,
      policy,
      connectTimeoutMs,
      totalTimeoutMs,
      allowCustomPort,
    });

    // If server rejects HEAD with 405 Method Not Allowed or 501, fall back to GET
    if (res.statusCode === 405 || res.statusCode === 501) {
      res = await guardedFetch(requestUrl, {
        method: "GET",
        resolver,
        policy,
        connectTimeoutMs,
        totalTimeoutMs,
        allowCustomPort,
      });
    }

    response = res;
  } catch {
    // If HEAD failed with network error, attempt GET
    try {
      response = await guardedFetch(requestUrl, {
        method: "GET",
        resolver,
        policy,
        connectTimeoutMs,
        totalTimeoutMs,
        allowCustomPort,
      });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      const notAssessedHeaders = [
        "SITE_HSTS",
        "SITE_CSP",
        "SITE_XCTO",
        "SITE_FRAMING",
        "SITE_REFERRER_POLICY",
        "SITE_PERMISSIONS_POLICY",
        "SITE_VERSION_DISCLOSURE",
      ].map((code) =>
        createFinding(code, "not_assessed", "info", `HTTPS request failed: ${msg}`)
      );

      const notAssessedCookies = [
        "SITE_COOKIE_SECURE",
        "SITE_COOKIE_HTTPONLY",
        "SITE_COOKIE_SAMESITE",
      ].map((code) =>
        createFinding(code, "not_assessed", "info", `HTTPS request failed: ${msg}`)
      );

      return {
        headerFindings: notAssessedHeaders,
        cookieFindings: notAssessedCookies,
        responseMeta: {
          finalUrl: requestUrl,
          statusCode: 0,
          redirectCount: 0,
        },
      };
    }
  }

  const headers = response.headers;

  // 1. SITE_HSTS
  // Triggers when: missing (medium) or max-age under 15552000 (low)
  const hsts = getHeaderValue(headers, "Strict-Transport-Security");
  let hstsFinding: Finding;
  if (!hsts) {
    hstsFinding = createFinding(
      "SITE_HSTS",
      "warn",
      "medium",
      "Strict-Transport-Security header is absent in HTTPS response"
    );
  } else {
    const maxAgeMatch = hsts.match(/max-age\s*=\s*(\d+)/i);
    const maxAge = maxAgeMatch && maxAgeMatch[1] ? parseInt(maxAgeMatch[1], 10) : 0;
    if (maxAge < 15552000) {
      hstsFinding = createFinding(
        "SITE_HSTS",
        "warn",
        "low",
        `Strict-Transport-Security max-age is ${maxAge} seconds (recommended >= 15552000 seconds / 180 days)`,
        "Increase HSTS max-age to at least 15552000 seconds (180 days) and includeSubDomains."
      );
    } else {
      hstsFinding = createFinding(
        "SITE_HSTS",
        "pass",
        "info",
        `Strict-Transport-Security configured with max-age=${maxAge}`
      );
    }
  }

  // 2. SITE_CSP
  // Triggers when: missing (medium) or script-src or default-src allows unsafe-inline or unsafe-eval (low)
  const csp = getHeaderValue(headers, "Content-Security-Policy");
  let cspFinding: Finding;
  if (!csp) {
    cspFinding = createFinding(
      "SITE_CSP",
      "warn",
      "medium",
      "Content-Security-Policy header is absent"
    );
  } else {
    const unsafeDirectives: string[] = [];
    // Check script-src and default-src directives
    const directives = csp.split(";").map((d) => d.trim().toLowerCase());
    for (const d of directives) {
      if (d.startsWith("script-src") || d.startsWith("default-src")) {
        if (d.includes("'unsafe-inline'")) unsafeDirectives.push("'unsafe-inline'");
        if (d.includes("'unsafe-eval'")) unsafeDirectives.push("'unsafe-eval'");
      }
    }

    if (unsafeDirectives.length > 0) {
      cspFinding = createFinding(
        "SITE_CSP",
        "warn",
        "low",
        `Content-Security-Policy includes insecure directives: ${Array.from(new Set(unsafeDirectives)).join(", ")}`,
        "Refactor inline scripts and remove 'unsafe-inline' and 'unsafe-eval' from Content-Security-Policy."
      );
    } else {
      cspFinding = createFinding(
        "SITE_CSP",
        "pass",
        "info",
        "Content-Security-Policy is present and restricts script execution"
      );
    }
  }

  // 3. SITE_XCTO
  // Triggers when: not nosniff
  const xcto = getHeaderValue(headers, "X-Content-Type-Options");
  let xctoFinding: Finding;
  if (!xcto || xcto.trim().toLowerCase() !== "nosniff") {
    xctoFinding = createFinding(
      "SITE_XCTO",
      "warn",
      "low",
      `X-Content-Type-Options is ${xcto ? `'${xcto}'` : "absent"} (expected 'nosniff')`
    );
  } else {
    xctoFinding = createFinding(
      "SITE_XCTO",
      "pass",
      "info",
      "X-Content-Type-Options is configured to 'nosniff'"
    );
  }

  // 4. SITE_FRAMING
  // Triggers when: neither frame-ancestors nor X-Frame-Options
  const xfo = getHeaderValue(headers, "X-Frame-Options");
  const hasFrameAncestors = csp && /frame-ancestors\s+/i.test(csp);
  let framingFinding: Finding;

  if (hasFrameAncestors) {
    framingFinding = createFinding(
      "SITE_FRAMING",
      "pass",
      "info",
      "Framing protection enforced via CSP frame-ancestors directive"
    );
  } else if (xfo && (xfo.toUpperCase() === "DENY" || xfo.toUpperCase() === "SAMEORIGIN")) {
    framingFinding = createFinding(
      "SITE_FRAMING",
      "pass",
      "info",
      `Framing protection enforced via X-Frame-Options: ${xfo.toUpperCase()}`
    );
  } else {
    framingFinding = createFinding(
      "SITE_FRAMING",
      "warn",
      "low",
      "Neither Content-Security-Policy frame-ancestors nor valid X-Frame-Options configured"
    );
  }

  // 5. SITE_REFERRER_POLICY
  // Triggers when: missing
  const referrerPolicy = getHeaderValue(headers, "Referrer-Policy");
  let referrerFinding: Finding;
  if (!referrerPolicy) {
    referrerFinding = createFinding(
      "SITE_REFERRER_POLICY",
      "warn",
      "low",
      "Referrer-Policy header is absent"
    );
  } else {
    referrerFinding = createFinding(
      "SITE_REFERRER_POLICY",
      "pass",
      "info",
      `Referrer-Policy configured: '${referrerPolicy}'`
    );
  }

  // 6. SITE_PERMISSIONS_POLICY
  // Triggers when: missing
  const permissionsPolicy =
    getHeaderValue(headers, "Permissions-Policy") ||
    getHeaderValue(headers, "Feature-Policy");
  let permissionsFinding: Finding;
  if (!permissionsPolicy) {
    permissionsFinding = createFinding(
      "SITE_PERMISSIONS_POLICY",
      "warn",
      "low",
      "Permissions-Policy header is absent"
    );
  } else {
    permissionsFinding = createFinding(
      "SITE_PERMISSIONS_POLICY",
      "pass",
      "info",
      "Permissions-Policy header is configured"
    );
  }

  // 7. SITE_VERSION_DISCLOSURE
  // Triggers when: Server or X-Powered-By reveals a version number
  const serverHeader = getHeaderValue(headers, "Server");
  const xPoweredBy = getHeaderValue(headers, "X-Powered-By");
  const versionRegex = /(?:\/|v|\s)\d+(\.\d+)+/i;

  const disclosesServerVersion = serverHeader && versionRegex.test(serverHeader);
  const disclosesPoweredByVersion = xPoweredBy && versionRegex.test(xPoweredBy);

  let versionFinding: Finding;
  if (disclosesServerVersion || disclosesPoweredByVersion) {
    const revealed: string[] = [];
    if (disclosesServerVersion) revealed.push(`Server: '${serverHeader}'`);
    if (disclosesPoweredByVersion) revealed.push(`X-Powered-By: '${xPoweredBy}'`);
    versionFinding = createFinding(
      "SITE_VERSION_DISCLOSURE",
      "warn",
      "low",
      `Software version disclosed in response headers: ${revealed.join(", ")}`
    );
  } else {
    versionFinding = createFinding(
      "SITE_VERSION_DISCLOSURE",
      "pass",
      "info",
      "No software versions disclosed in Server or X-Powered-By headers"
    );
  }

  const headerFindings = [
    hstsFinding,
    cspFinding,
    xctoFinding,
    framingFinding,
    referrerFinding,
    permissionsFinding,
    versionFinding,
  ];

  // ================= COOKIES =================
  // Cookies parsed via set-cookie-parser. Values are NEVER read or stored.
  const rawSetCookie = headers["set-cookie"];
  const parsedCookies = rawSetCookie
    ? setCookieParser.parse(
        Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie],
        { decodeValues: false }
      )
    : [];

  const cookieFindings: Finding[] = [];

  if (parsedCookies.length === 0) {
    // "No Set-Cookie header: single pass" (Appendix B3)
    cookieFindings.push(
      createFinding(
        "SITE_COOKIE_SECURE",
        "pass",
        "info",
        "No Set-Cookie header observed on the checked response"
      )
    );
  } else {
    // 1. SITE_COOKIE_SECURE
    // Missing on an HTTPS response (medium)
    const insecureCookies = parsedCookies.filter((c) => !c.secure);
    if (insecureCookies.length > 0) {
      cookieFindings.push(
        createFinding(
          "SITE_COOKIE_SECURE",
          "warn",
          "medium",
          `Cookie(s) missing Secure attribute: ${insecureCookies.map((c) => `'${c.name}'`).join(", ")}`,
          "Configure all cookies sent over HTTPS with the Secure attribute."
        )
      );
    } else {
      cookieFindings.push(
        createFinding(
          "SITE_COOKIE_SECURE",
          "pass",
          "info",
          `All set cookies (${parsedCookies.map((c) => `'${c.name}'`).join(", ")}) carry the Secure attribute`
        )
      );
    }

    // 2. SITE_COOKIE_HTTPONLY
    // Missing (medium if the name looks like session, auth, token, sid, jwt; otherwise low)
    const nonHttpOnlyCookies = parsedCookies.filter((c) => !c.httpOnly);
    if (nonHttpOnlyCookies.length > 0) {
      const isAuthLike = nonHttpOnlyCookies.some((c) =>
        /(session|auth|token|sid|jwt|login)/i.test(c.name)
      );
      cookieFindings.push(
        createFinding(
          "SITE_COOKIE_HTTPONLY",
          "warn",
          isAuthLike ? "medium" : "low",
          `Cookie(s) missing HttpOnly attribute: ${nonHttpOnlyCookies.map((c) => `'${c.name}'`).join(", ")}`,
          "Set the HttpOnly flag on cookies, especially session and authentication tokens."
        )
      );
    } else {
      cookieFindings.push(
        createFinding(
          "SITE_COOKIE_HTTPONLY",
          "pass",
          "info",
          "All set cookies carry the HttpOnly attribute"
        )
      );
    }

    // 3. SITE_COOKIE_SAMESITE
    // Missing (low)
    const missingSameSiteCookies = parsedCookies.filter(
      (c) => !c.sameSite || c.sameSite.toLowerCase() === "none"
    );
    if (missingSameSiteCookies.length > 0) {
      cookieFindings.push(
        createFinding(
          "SITE_COOKIE_SAMESITE",
          "warn",
          "low",
          `Cookie(s) missing strict/lax SameSite attribute: ${missingSameSiteCookies.map((c) => `'${c.name}'`).join(", ")}`,
          "Add SameSite=Lax or SameSite=Strict attribute to cookies to mitigate CSRF risks."
        )
      );
    } else {
      cookieFindings.push(
        createFinding(
          "SITE_COOKIE_SAMESITE",
          "pass",
          "info",
          "All set cookies specify SameSite attribute (Lax or Strict)"
        )
      );
    }
  }

  return {
    headerFindings,
    cookieFindings,
    responseMeta: {
      finalUrl: response.finalUrl,
      statusCode: response.statusCode,
      redirectCount: response.redirectCount,
      ipAddress: response.ipAddress,
    },
  };
}
