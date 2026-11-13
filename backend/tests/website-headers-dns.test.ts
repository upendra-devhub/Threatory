import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { checkHeadersAndCookies } from "../src/modules/website/http-checker.js";
import { checkEmailDns, EmailDnsResolver } from "../src/modules/website/dns-checker.js";
import { DnsResolver } from "../src/modules/website/ssrf-guard.js";

describe("Headers, Cookies, and Email DNS Checks (Task 9c)", () => {
  let fakeServer: http.Server;
  let serverPort: number;

  let currentResponseHeaders: Record<string, string | string[]> = {};
  let currentResponseStatus = 200;

  const permissivePolicy = () => true;
  const localResolver: DnsResolver = {
    resolve4: vi.fn().mockResolvedValue(["127.0.0.1"]),
    resolve6: vi.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    fakeServer = http.createServer((_req, res) => {
      res.writeHead(currentResponseStatus, currentResponseHeaders);
      res.end("Response from test server");
    });
    await new Promise<void>((resolve) => fakeServer.listen(0, "127.0.0.1", () => resolve()));
    const addr = fakeServer.address();
    serverPort = typeof addr === "object" && addr ? addr.port : 0;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => fakeServer.close(() => resolve()));
  });

  describe("HTTP Security Headers Checks", () => {
    it("evaluates missing headers as expected warn findings", async () => {
      currentResponseStatus = 200;
      currentResponseHeaders = {}; // All security headers missing

      const targetUrl = new URL("http://127.0.0.1");
      const { headerFindings } = await checkHeadersAndCookies(targetUrl, {
        resolver: localResolver,
        policy: permissivePolicy,
        customUrl: `http://127.0.0.1:${serverPort}/`,
        allowCustomPort: true,
      });

      const hsts = headerFindings.find((f) => f.code === "SITE_HSTS");
      expect(hsts?.outcome).toBe("warn");
      expect(hsts?.severity).toBe("medium");

      const csp = headerFindings.find((f) => f.code === "SITE_CSP");
      expect(csp?.outcome).toBe("warn");
      expect(csp?.severity).toBe("medium");

      const xcto = headerFindings.find((f) => f.code === "SITE_XCTO");
      expect(xcto?.outcome).toBe("warn");
      expect(xcto?.severity).toBe("low");

      const framing = headerFindings.find((f) => f.code === "SITE_FRAMING");
      expect(framing?.outcome).toBe("warn");
      expect(framing?.severity).toBe("low");

      const referrer = headerFindings.find((f) => f.code === "SITE_REFERRER_POLICY");
      expect(referrer?.outcome).toBe("warn");
      expect(referrer?.severity).toBe("low");

      const permissions = headerFindings.find((f) => f.code === "SITE_PERMISSIONS_POLICY");
      expect(permissions?.outcome).toBe("warn");
      expect(permissions?.severity).toBe("low");

      const version = headerFindings.find((f) => f.code === "SITE_VERSION_DISCLOSURE");
      expect(version?.outcome).toBe("pass"); // No server header = no disclosure
    });

    it("evaluates hardened headers as pass findings", async () => {
      currentResponseStatus = 200;
      currentResponseHeaders = {
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        Server: "Apache", // Generic without version
      };

      const targetUrl = new URL("http://127.0.0.1");
      const { headerFindings } = await checkHeadersAndCookies(targetUrl, {
        resolver: localResolver,
        policy: permissivePolicy,
        customUrl: `http://127.0.0.1:${serverPort}/`,
        allowCustomPort: true,
      });

      for (const finding of headerFindings) {
        expect(finding.outcome).toBe("pass");
        expect(finding.severity).toBe("info");
      }
    });

    it("detects HSTS low max-age and CSP unsafe-inline directives", async () => {
      currentResponseStatus = 200;
      currentResponseHeaders = {
        "Strict-Transport-Security": "max-age=86400", // Only 1 day (< 15552000)
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        Server: "nginx/1.22.1",
      };

      const targetUrl = new URL("http://127.0.0.1");
      const { headerFindings } = await checkHeadersAndCookies(targetUrl, {
        resolver: localResolver,
        policy: permissivePolicy,
        customUrl: `http://127.0.0.1:${serverPort}/`,
        allowCustomPort: true,
      });

      const hsts = headerFindings.find((f) => f.code === "SITE_HSTS");
      expect(hsts?.outcome).toBe("warn");
      expect(hsts?.severity).toBe("low");

      const csp = headerFindings.find((f) => f.code === "SITE_CSP");
      expect(csp?.outcome).toBe("warn");
      expect(csp?.severity).toBe("low");
      expect(csp?.evidence).toContain("'unsafe-inline'");

      const version = headerFindings.find((f) => f.code === "SITE_VERSION_DISCLOSURE");
      expect(version?.outcome).toBe("warn");
      expect(version?.severity).toBe("low");
      expect(version?.evidence).toContain("nginx/1.22.1");
    });
  });

  describe("Cookies Checks and Invariants", () => {
    it("emits single pass finding for cookies when no Set-Cookie header is sent", async () => {
      currentResponseStatus = 200;
      currentResponseHeaders = {};

      const targetUrl = new URL("http://127.0.0.1");
      const { cookieFindings } = await checkHeadersAndCookies(targetUrl, {
        resolver: localResolver,
        policy: permissivePolicy,
        customUrl: `http://127.0.0.1:${serverPort}/`,
        allowCustomPort: true,
      });

      expect(cookieFindings).toHaveLength(1);
      const firstCookie = cookieFindings[0];
      expect(firstCookie).toBeDefined();
      expect(firstCookie?.code).toBe("SITE_COOKIE_SECURE");
      expect(firstCookie?.category).toBe("cookies");
      expect(firstCookie?.outcome).toBe("pass");
      expect(firstCookie?.severity).toBe("info");
      expect(firstCookie?.evidence).toBe(
        "No Set-Cookie header observed on the checked response"
      );
    });

    it("evaluates cookie flags: missing Secure, HttpOnly, SameSite, and never leaks cookie values", async () => {
      const secretValue = "SUPER_SECRET_SESSION_TOKEN_123456";
      currentResponseStatus = 200;
      currentResponseHeaders = {
        "Set-Cookie": [
          `session_id=${secretValue}; Path=/`, // Missing Secure, HttpOnly, SameSite
          `theme=dark; Path=/; Secure; SameSite=Lax`, // Missing HttpOnly on non-auth cookie
        ],
      };

      const targetUrl = new URL("http://127.0.0.1");
      const { cookieFindings } = await checkHeadersAndCookies(targetUrl, {
        resolver: localResolver,
        policy: permissivePolicy,
        customUrl: `http://127.0.0.1:${serverPort}/`,
        allowCustomPort: true,
      });

      const secureFinding = cookieFindings.find((f) => f.code === "SITE_COOKIE_SECURE");
      expect(secureFinding?.outcome).toBe("warn");
      expect(secureFinding?.severity).toBe("medium");

      const httpOnlyFinding = cookieFindings.find((f) => f.code === "SITE_COOKIE_HTTPONLY");
      expect(httpOnlyFinding?.outcome).toBe("warn");
      expect(httpOnlyFinding?.severity).toBe("medium"); // session_id is auth-like

      const sameSiteFinding = cookieFindings.find((f) => f.code === "SITE_COOKIE_SAMESITE");
      expect(sameSiteFinding?.outcome).toBe("warn");
      expect(sameSiteFinding?.severity).toBe("low");

      // CRITICAL INVARIANT: Secret cookie values must never be stored, logged, or returned
      const allEvidence = cookieFindings.map((f) => f.evidence).join(" ");
      expect(allEvidence).not.toContain(secretValue);
    });
  });

  describe("DNS and Email Checks (SPF, DMARC, CAA)", () => {
    it("evaluates missing SPF, DMARC, and CAA as warn findings", async () => {
      const emptyResolver: EmailDnsResolver = {
        resolveTxt: vi.fn().mockResolvedValue([]),
        resolveCaa: vi.fn().mockResolvedValue([]),
      };

      const targetUrl = new URL("https://example.com");
      const { findings } = await checkEmailDns(targetUrl, emptyResolver);

      const spf = findings.find((f) => f.code === "SITE_SPF");
      expect(spf?.outcome).toBe("warn");
      expect(spf?.severity).toBe("medium");

      const dmarc = findings.find((f) => f.code === "SITE_DMARC");
      expect(dmarc?.outcome).toBe("warn");
      expect(dmarc?.severity).toBe("medium");

      const caa = findings.find((f) => f.code === "SITE_CAA");
      expect(caa?.outcome).toBe("warn");
      expect(caa?.severity).toBe("low");
    });

    it("evaluates properly configured SPF, DMARC (quarantine/reject), and CAA as pass findings", async () => {
      const hardenedResolver: EmailDnsResolver = {
        resolveTxt: vi.fn().mockImplementation(async (host: string) => {
          if (host === "example.com") {
            return [["v=spf1 include:_spf.example.com -all"]];
          }
          if (host === "_dmarc.example.com") {
            return [["v=DMARC1; p=reject; rua=mailto:dmarc@example.com"]];
          }
          return [];
        }),
        resolveCaa: vi.fn().mockResolvedValue([
          { critical: 0, issue: "letsencrypt.org" },
        ]),
      };

      const targetUrl = new URL("https://example.com");
      const { findings } = await checkEmailDns(targetUrl, hardenedResolver);

      for (const f of findings) {
        expect(f.outcome).toBe("pass");
        expect(f.severity).toBe("info");
      }
    });

    it("evaluates weak SPF (+all) and monitor-only DMARC (p=none) as warn findings", async () => {
      const weakResolver: EmailDnsResolver = {
        resolveTxt: vi.fn().mockImplementation(async (host: string) => {
          if (host === "example.com") {
            return [["v=spf1 +all"]];
          }
          if (host === "_dmarc.example.com") {
            return [["v=DMARC1; p=none; sp=none"]];
          }
          return [];
        }),
        resolveCaa: vi.fn().mockResolvedValue([]),
      };

      const targetUrl = new URL("https://example.com");
      const { findings } = await checkEmailDns(targetUrl, weakResolver);

      const spf = findings.find((f) => f.code === "SITE_SPF");
      expect(spf?.outcome).toBe("warn");
      expect(spf?.severity).toBe("medium");

      const dmarc = findings.find((f) => f.code === "SITE_DMARC");
      expect(dmarc?.outcome).toBe("warn");
      expect(dmarc?.severity).toBe("low");
    });

    it("marks DNS checks as not_assessed on unexpected DNS timeout or network failure", async () => {
      const failingResolver: EmailDnsResolver = {
        resolveTxt: vi.fn().mockRejectedValue(new Error("ETIMEDOUT")),
        resolveCaa: vi.fn().mockRejectedValue(new Error("ETIMEDOUT")),
      };

      const targetUrl = new URL("https://example.com");
      const { findings } = await checkEmailDns(targetUrl, failingResolver);

      for (const f of findings) {
        expect(f.outcome).toBe("not_assessed");
        expect(f.severity).toBe("info");
      }
    });
  });
});
