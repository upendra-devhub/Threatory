import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import https from "node:https";
import selfsigned from "selfsigned";
import { checkDnsAndTls, checkHttpToHttpsAndRedirects } from "../src/modules/website/tls-checker.js";
import { DnsResolver } from "../src/modules/website/ssrf-guard.js";

describe("DNS and TLS Checks (Task 9b)", () => {
  let validServer: https.Server;
  let validPort: number;
  let validCa: string;

  let expiredServer: https.Server;
  let expiredPort: number;
  let expiredCa: string;

  let wrongHostServer: https.Server;
  let wrongHostPort: number;
  let wrongHostCa: string;

  const permissivePolicy = () => true;
  const localResolver: DnsResolver = {
    resolve4: vi.fn().mockResolvedValue(["127.0.0.1"]),
    resolve6: vi.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    // 1. Valid certificate for 127.0.0.1 (valid 90 days)
    const validPems = await selfsigned.generate(
      [{ name: "commonName", value: "127.0.0.1" }],
      {
        notAfterDate: new Date(Date.now() + 90 * 86400000),
        extensions: [{ name: "subjectAltName", altNames: [{ type: 7, ip: "127.0.0.1" }] }],
      }
    );
    validCa = validPems.cert;
    validServer = https.createServer(
      { key: validPems.private, cert: validPems.cert },
      (_req, res) => res.end("valid tls")
    );
    await new Promise<void>((resolve) => validServer.listen(0, "127.0.0.1", () => resolve()));
    const validAddr = validServer.address();
    validPort = typeof validAddr === "object" && validAddr ? validAddr.port : 0;

    // 2. Expired certificate (expired 5 days ago)
    const expiredPems = await selfsigned.generate(
      [{ name: "commonName", value: "127.0.0.1" }],
      {
        notBeforeDate: new Date(Date.now() - 30 * 86400000),
        notAfterDate: new Date(Date.now() - 5 * 86400000),
        extensions: [{ name: "subjectAltName", altNames: [{ type: 7, ip: "127.0.0.1" }] }],
      }
    );
    expiredCa = expiredPems.cert;
    expiredServer = https.createServer(
      { key: expiredPems.private, cert: expiredPems.cert },
      (_req, res) => res.end("expired tls")
    );
    await new Promise<void>((resolve) => expiredServer.listen(0, "127.0.0.1", () => resolve()));
    const expAddr = expiredServer.address();
    expiredPort = typeof expAddr === "object" && expAddr ? expAddr.port : 0;

    // 3. Wrong host certificate (SAN matches 'different-host.test', not 127.0.0.1)
    const wrongHostPems = await selfsigned.generate(
      [{ name: "commonName", value: "different-host.test" }],
      {
        notAfterDate: new Date(Date.now() + 90 * 86400000),
        extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: "different-host.test" }] }],
      }
    );
    wrongHostCa = wrongHostPems.cert;
    wrongHostServer = https.createServer(
      { key: wrongHostPems.private, cert: wrongHostPems.cert },
      (_req, res) => res.end("wrong host tls")
    );
    await new Promise<void>((resolve) => wrongHostServer.listen(0, "127.0.0.1", () => resolve()));
    const wrongAddr = wrongHostServer.address();
    wrongHostPort = typeof wrongAddr === "object" && wrongAddr ? wrongAddr.port : 0;
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve) => validServer.close(() => resolve())),
      new Promise<void>((resolve) => expiredServer.close(() => resolve())),
      new Promise<void>((resolve) => wrongHostServer.close(() => resolve())),
    ]);
  });

  it("handles DNS failure by emitting fail for SITE_DNS_RESOLVES and not_assessed for dependent checks", async () => {
    const failingResolver: DnsResolver = {
      resolve4: vi.fn().mockRejectedValue(new Error("ENOTFOUND")),
      resolve6: vi.fn().mockRejectedValue(new Error("ENOTFOUND")),
    };

    const targetUrl = new URL("https://non-existent-domain-test-threatory.invalid");
    const result = await checkDnsAndTls(targetUrl, {
      resolver: failingResolver,
      policy: permissivePolicy,
    });

    const dnsFinding = result.findings.find((f) => f.code === "SITE_DNS_RESOLVES");
    expect(dnsFinding).toBeDefined();
    expect(dnsFinding?.outcome).toBe("fail");
    expect(dnsFinding?.severity).toBe("high");

    const dependentCodes = [
      "SITE_HTTPS_AVAILABLE",
      "SITE_TLS_CERT_VALID",
      "SITE_TLS_EXPIRY",
      "SITE_TLS_PROTOCOL",
    ];

    for (const code of dependentCodes) {
      const f = result.findings.find((item) => item.code === code);
      expect(f).toBeDefined();
      expect(f?.outcome).toBe("not_assessed");
    }
  });

  it("evaluates valid certificate as pass with certSummary details populated", async () => {
    const targetUrl = new URL("https://127.0.0.1");
    const result = await checkDnsAndTls(targetUrl, {
      resolver: localResolver,
      policy: permissivePolicy,
      customTlsPort: validPort,
      customCa: [validCa],
    });

    const dnsFinding = result.findings.find((f) => f.code === "SITE_DNS_RESOLVES");
    expect(dnsFinding?.outcome).toBe("pass");

    const httpsFinding = result.findings.find((f) => f.code === "SITE_HTTPS_AVAILABLE");
    expect(httpsFinding?.outcome).toBe("pass");

    const certFinding = result.findings.find((f) => f.code === "SITE_TLS_CERT_VALID");
    expect(certFinding?.outcome).toBe("pass");
    expect(certFinding?.severity).toBe("info");

    const expiryFinding = result.findings.find((f) => f.code === "SITE_TLS_EXPIRY");
    expect(expiryFinding?.outcome).toBe("pass");

    const protoFinding = result.findings.find((f) => f.code === "SITE_TLS_PROTOCOL");
    expect(protoFinding?.outcome).toBe("pass");

    expect(result.certSummary).toBeDefined();
    expect(result.certSummary?.authorized).toBe(true);
    expect(result.certSummary?.daysRemaining).toBeGreaterThan(30);
    expect(result.certSummary?.protocol).toMatch(/TLSv1\.[23]/);
  });

  it("detects expired certificate and records CERT_HAS_EXPIRED error", async () => {
    const targetUrl = new URL("https://127.0.0.1");
    const result = await checkDnsAndTls(targetUrl, {
      resolver: localResolver,
      policy: permissivePolicy,
      customTlsPort: expiredPort,
      customCa: [expiredCa],
    });

    const certFinding = result.findings.find((f) => f.code === "SITE_TLS_CERT_VALID");
    expect(certFinding?.outcome).toBe("fail");
    expect(certFinding?.severity).toBe("high");
    expect(certFinding?.evidence).toContain("CERT_HAS_EXPIRED");

    const expiryFinding = result.findings.find((f) => f.code === "SITE_TLS_EXPIRY");
    expect(expiryFinding?.outcome).toBe("warn");
    expect(expiryFinding?.severity).toBe("medium");

    expect(result.certSummary?.authorized).toBe(false);
    expect(result.certSummary?.authorizationError).toContain("CERT_HAS_EXPIRED");
  });

  it("detects hostname mismatch and records ERR_TLS_CERT_ALTNAME_INVALID", async () => {
    const targetUrl = new URL("https://127.0.0.1");
    const result = await checkDnsAndTls(targetUrl, {
      resolver: localResolver,
      policy: permissivePolicy,
      customTlsPort: wrongHostPort,
      customCa: [wrongHostCa],
    });

    const certFinding = result.findings.find((f) => f.code === "SITE_TLS_CERT_VALID");
    expect(certFinding?.outcome).toBe("fail");
    expect(certFinding?.severity).toBe("high");
    expect(certFinding?.evidence).toContain("ERR_TLS_CERT_ALTNAME_INVALID");
    expect(result.certSummary?.authorized).toBe(false);
  });

  it("detects untrusted self-signed certificate and records DEPTH_ZERO_SELF_SIGNED_CERT", async () => {
    const targetUrl = new URL("https://127.0.0.1");
    // Connect without customCa
    const result = await checkDnsAndTls(targetUrl, {
      resolver: localResolver,
      policy: permissivePolicy,
      customTlsPort: validPort,
    });

    const certFinding = result.findings.find((f) => f.code === "SITE_TLS_CERT_VALID");
    expect(certFinding?.outcome).toBe("fail");
    expect(certFinding?.severity).toBe("high");
    expect(certFinding?.evidence).toContain("DEPTH_ZERO_SELF_SIGNED_CERT");
    expect(result.certSummary?.authorized).toBe(false);
  });

  it("checkHttpToHttpsAndRedirects evaluates redirect behaviors", async () => {
    const targetUrl = new URL("https://127.0.0.1");
    // Connect to invalid port for plain HTTP to verify warn outcome on failure
    const { httpToHttpsFinding, redirectsFinding } = await checkHttpToHttpsAndRedirects(targetUrl, {
      resolver: localResolver,
      policy: permissivePolicy,
      customHttpPort: 54321, // non-listening port
      connectTimeoutMs: 1000,
    });

    expect(httpToHttpsFinding.code).toBe("SITE_HTTP_TO_HTTPS");
    expect(httpToHttpsFinding.outcome).toBe("warn");
    expect(httpToHttpsFinding.severity).toBe("medium");

    expect(redirectsFinding.code).toBe("SITE_REDIRECTS");
    expect(redirectsFinding.outcome).toBe("not_assessed");
  });
});
