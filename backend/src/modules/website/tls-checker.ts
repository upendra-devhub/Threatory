import tls from "node:tls";
import net from "node:net";
import { getDomain } from "tldts";
import { Finding } from "@threatory/contracts";
import {
  AddressPolicy,
  DnsResolver,
  createDefaultResolver,
  defaultAddressPolicy,
  resolveAndValidateHost,
  createGuardedLookup,
  guardedFetch,
  DEFAULT_CONNECT_TIMEOUT_MS,
} from "./ssrf-guard.js";
import { WEBSITE_RULES } from "./rules.config.js";

export interface CertificateSummary {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  protocol: string;
  daysRemaining: number;
  authorized: boolean;
  authorizationError?: string;
}

export interface TlsCheckResults {
  findings: Finding[];
  certSummary?: CertificateSummary;
  resolvedIps?: string[];
}

export interface RedirectCheckResults {
  httpToHttpsFinding: Finding;
  redirectsFinding: Finding;
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
    category: rule ? rule.category : "tls",
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

/**
 * Checks DNS resolution and connects to port 443 with tls.connect using the guarded lookup.
 * Reads peer certificate without aborting (rejectUnauthorized: false), recording exact authorizationError.
 */
export async function checkDnsAndTls(
  targetUrl: URL,
  options: {
    resolver?: DnsResolver;
    policy?: AddressPolicy;
    connectTimeoutMs?: number;
    customTlsPort?: number; // Allows test suites to connect to local fake TLS server
    customCa?: string[]; // Allows tests to trust local self-signed root
  } = {}
): Promise<TlsCheckResults> {
  const hostname = targetUrl.hostname;
  const resolver = options.resolver ?? createDefaultResolver();
  const policy = options.policy ?? defaultAddressPolicy;
  const timeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const tlsPort = options.customTlsPort ?? 443;
  const customCa = options.customCa;

  const findings: Finding[] = [];
  let resolvedIps: string[] = [];

  // 1. SITE_DNS_RESOLVES
  try {
    const resolved = await resolveAndValidateHost(hostname, resolver, policy);
    resolvedIps = resolved.map((r) => r.address);
    findings.push(
      createFinding(
        "SITE_DNS_RESOLVES",
        "pass",
        "info",
        `Hostname '${hostname}' resolved to ${resolvedIps.join(", ")}`
      )
    );
  } catch (err: unknown) {
    const msg = (err as Error).message;
    findings.push(
      createFinding(
        "SITE_DNS_RESOLVES",
        "fail",
        "high",
        `DNS resolution failed for '${hostname}': ${msg}`
      )
    );

    // Dependent checks are not_assessed
    findings.push(
      createFinding("SITE_HTTPS_AVAILABLE", "not_assessed", "info", "DNS resolution failed; port 443 not queried."),
      createFinding("SITE_TLS_CERT_VALID", "not_assessed", "info", "DNS resolution failed; certificate not queried."),
      createFinding("SITE_TLS_EXPIRY", "not_assessed", "info", "DNS resolution failed; certificate expiry not queried."),
      createFinding("SITE_TLS_PROTOCOL", "not_assessed", "info", "DNS resolution failed; TLS protocol not queried.")
    );

    return { findings };
  }

  // 2. Connect to port 443 via tls.connect using guarded lookup
  const guardedLookup = createGuardedLookup(resolver, policy);

  return new Promise<TlsCheckResults>((resolve) => {
    let socket: tls.TLSSocket | null = null;
    let isFinished = false;

    const cleanup = () => {
      if (socket) {
        socket.destroy();
        socket = null;
      }
    };

    const finish = (result: TlsCheckResults) => {
      if (isFinished) return;
      isFinished = true;
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      findings.push(
        createFinding(
          "SITE_HTTPS_AVAILABLE",
          "fail",
          "high",
          `Connection to ${hostname}:${tlsPort} timed out after ${timeoutMs}ms`
        ),
        createFinding("SITE_TLS_CERT_VALID", "not_assessed", "info", "HTTPS connection timed out; certificate not evaluated."),
        createFinding("SITE_TLS_EXPIRY", "not_assessed", "info", "HTTPS connection timed out; expiry not evaluated."),
        createFinding("SITE_TLS_PROTOCOL", "not_assessed", "info", "HTTPS connection timed out; protocol not evaluated.")
      );
      finish({ findings, resolvedIps });
    }, timeoutMs);

    try {
      const isIp = net.isIP(hostname) !== 0;
      socket = tls.connect({
        host: hostname,
        port: tlsPort,
        servername: isIp ? undefined : hostname,
        lookup: guardedLookup,
        rejectUnauthorized: false, // Permit reading certificate and authorizationError
        ca: customCa,
      });

      socket.on("secureConnect", () => {
        clearTimeout(timer);
        if (!socket) return;

        // SITE_HTTPS_AVAILABLE: pass
        findings.push(
          createFinding(
            "SITE_HTTPS_AVAILABLE",
            "pass",
            "info",
            `Successfully established TLS connection to ${hostname}:${tlsPort}`
          )
        );

        const protocol = socket.getProtocol() || "unknown";
        const cert = socket.getPeerCertificate(true);
        const authorized = socket.authorized;
        const authError = socket.authorizationError
          ? String(socket.authorizationError)
          : undefined;

        // If no peer certificate presented
        if (!cert || Object.keys(cert).length === 0) {
          findings.push(
            createFinding(
              "SITE_TLS_CERT_VALID",
              "fail",
              "high",
              "Server did not present a peer TLS certificate"
            ),
            createFinding("SITE_TLS_EXPIRY", "not_assessed", "info", "No certificate presented to evaluate expiry."),
            createFinding("SITE_TLS_PROTOCOL", "not_assessed", "info", "No certificate presented to evaluate protocol.")
          );
          finish({ findings, resolvedIps });
          return;
        }

        const validFrom = cert.valid_from ? new Date(cert.valid_from).toISOString() : "";
        const validTo = cert.valid_to ? new Date(cert.valid_to).toISOString() : "";
        const daysRemaining = cert.valid_to
          ? Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;

        const toStr = (v: string | string[] | undefined): string => {
          if (!v) return "";
          return Array.isArray(v) ? v.join(", ") : String(v);
        };

        const subjectStr =
          typeof cert.subject === "object" && cert.subject
            ? toStr(cert.subject.CN) ||
              Object.entries(cert.subject)
                .map(([k, v]) => `${k}=${toStr(v as string | string[] | undefined)}`)
                .join(", ")
            : String(cert.subject || "unknown");

        const issuerStr =
          typeof cert.issuer === "object" && cert.issuer
            ? toStr(cert.issuer.O) ||
              toStr(cert.issuer.CN) ||
              Object.entries(cert.issuer)
                .map(([k, v]) => `${k}=${toStr(v as string | string[] | undefined)}`)
                .join(", ")
            : String(cert.issuer || "unknown");

        const certSummary: CertificateSummary = {
          subject: subjectStr,
          issuer: issuerStr,
          validFrom,
          validTo,
          protocol,
          daysRemaining,
          authorized,
          authorizationError: authError,
        };

        // 3. SITE_TLS_CERT_VALID
        if (authorized) {
          findings.push(
            createFinding(
              "SITE_TLS_CERT_VALID",
              "pass",
              "info",
              `Valid certificate issued to '${subjectStr}' by '${issuerStr}', unexpired and trusted`
            )
          );
        } else {
          findings.push(
            createFinding(
              "SITE_TLS_CERT_VALID",
              "fail",
              "high",
              `Certificate verification failed: ${authError || "untrusted or invalid certificate"}`,
              `Install a valid, untrusted certificate chain matching '${hostname}' issued by a recognized CA.`
            )
          );
        }

        // 4. SITE_TLS_EXPIRY
        // Triggers when: certificate expires within 14 days (medium) or 30 days (low).
        if (daysRemaining <= 0) {
          findings.push(
            createFinding(
              "SITE_TLS_EXPIRY",
              "warn",
              "medium",
              `Certificate is expired or expires today (valid until ${validTo})`,
              "Renew expired TLS certificate immediately."
            )
          );
        } else if (daysRemaining <= 14) {
          findings.push(
            createFinding(
              "SITE_TLS_EXPIRY",
              "warn",
              "medium",
              `Certificate expires in ${daysRemaining} days (valid until ${validTo})`,
              "Renew TLS certificate promptly (expires within 14 days)."
            )
          );
        } else if (daysRemaining <= 30) {
          findings.push(
            createFinding(
              "SITE_TLS_EXPIRY",
              "warn",
              "low",
              `Certificate expires in ${daysRemaining} days (valid until ${validTo})`,
              "Plan TLS certificate renewal (expires within 30 days)."
            )
          );
        } else {
          findings.push(
            createFinding(
              "SITE_TLS_EXPIRY",
              "pass",
              "info",
              `Certificate is valid for ${daysRemaining} more days (valid until ${validTo})`
            )
          );
        }

        // 5. SITE_TLS_PROTOCOL
        // Expected: TLS 1.2 or TLS 1.3
        if (protocol === "TLSv1.3" || protocol === "TLSv1.2") {
          findings.push(
            createFinding(
              "SITE_TLS_PROTOCOL",
              "pass",
              "info",
              `Modern TLS protocol negotiated: ${protocol}`
            )
          );
        } else {
          findings.push(
            createFinding(
              "SITE_TLS_PROTOCOL",
              "warn",
              "medium",
              `Deprecated TLS protocol negotiated: ${protocol}`,
              "Disable legacy protocols and configure server to support TLS 1.2 and TLS 1.3 only."
            )
          );
        }

        finish({ findings, certSummary, resolvedIps });
      });

      socket.on("error", (err: Error) => {
        clearTimeout(timer);
        findings.push(
          createFinding(
            "SITE_HTTPS_AVAILABLE",
            "fail",
            "high",
            `Failed to establish TLS connection to ${hostname}:${tlsPort}: ${err.message}`
          ),
          createFinding("SITE_TLS_CERT_VALID", "not_assessed", "info", "TLS connection failed; certificate could not be read."),
          createFinding("SITE_TLS_EXPIRY", "not_assessed", "info", "TLS connection failed; expiry could not be evaluated."),
          createFinding("SITE_TLS_PROTOCOL", "not_assessed", "info", "TLS connection failed; protocol could not be evaluated.")
        );
        finish({ findings, resolvedIps });
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      findings.push(
        createFinding(
          "SITE_HTTPS_AVAILABLE",
          "fail",
          "high",
          `TLS connection attempt threw an error: ${(err as Error).message}`
        ),
        createFinding("SITE_TLS_CERT_VALID", "not_assessed", "info", "TLS connection failed; certificate could not be read."),
        createFinding("SITE_TLS_EXPIRY", "not_assessed", "info", "TLS connection failed; expiry could not be evaluated."),
        createFinding("SITE_TLS_PROTOCOL", "not_assessed", "info", "TLS connection failed; protocol could not be evaluated.")
      );
      finish({ findings, resolvedIps });
    }
  });
}

/**
 * Checks HTTP to HTTPS redirection and redirect chain properties:
 * - SITE_HTTP_TO_HTTPS: plain HTTP redirects to HTTPS
 * - SITE_REDIRECTS: <= 3 hops and does not leave registrable domain
 */
export async function checkHttpToHttpsAndRedirects(
  targetUrl: URL,
  options: {
    resolver?: DnsResolver;
    policy?: AddressPolicy;
    connectTimeoutMs?: number;
    customHttpPort?: number; // For test servers
  } = {}
): Promise<RedirectCheckResults> {
  const hostname = targetUrl.hostname;
  const initialDomain = getDomain(hostname) || hostname;
  const resolver = options.resolver ?? createDefaultResolver();
  const policy = options.policy ?? defaultAddressPolicy;
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const httpPort = options.customHttpPort ?? 80;

  let httpToHttpsFinding: Finding;
  let redirectsFinding: Finding;

  const httpUrl = `http://${hostname}${httpPort === 80 ? "" : `:${httpPort}`}/`;

  try {
    const res = await guardedFetch(httpUrl, {
      resolver,
      policy,
      connectTimeoutMs,
      maxRedirects: 4,
      allowCustomPort: Boolean(options.customHttpPort && options.customHttpPort !== 80),
    });

    // Check if final URL uses https:
    const finalParsed = new URL(res.finalUrl);
    const redirectedToHttps = finalParsed.protocol === "https:";

    if (redirectedToHttps) {
      httpToHttpsFinding = createFinding(
        "SITE_HTTP_TO_HTTPS",
        "pass",
        "info",
        `Plain HTTP redirects to HTTPS (final URL: ${res.finalUrl})`
      );
    } else {
      httpToHttpsFinding = createFinding(
        "SITE_HTTP_TO_HTTPS",
        "warn",
        "medium",
        `Plain HTTP responded with status ${res.statusCode} without redirecting to HTTPS`,
        "Configure your web server to automatically redirect port 80 HTTP traffic to port 443 HTTPS."
      );
    }

    // Check redirects: more than 3 hops, or leaves registrable domain
    const finalDomain = getDomain(finalParsed.hostname) || finalParsed.hostname;
    const domainChanged = finalDomain.toLowerCase() !== initialDomain.toLowerCase();

    if (res.redirectCount > 3) {
      redirectsFinding = createFinding(
        "SITE_REDIRECTS",
        "warn",
        "low",
        `Redirect chain exceeded 3 hops (total: ${res.redirectCount} redirects)`,
        "Minimize redirect hops to fewer than 3 to improve latency and user security."
      );
    } else if (domainChanged) {
      redirectsFinding = createFinding(
        "SITE_REDIRECTS",
        "warn",
        "low",
        `Redirect leaves initial registrable domain '${initialDomain}' to '${finalDomain}'`,
        "Ensure redirect destinations remain within your authoritative domain."
      );
    } else {
      redirectsFinding = createFinding(
        "SITE_REDIRECTS",
        "pass",
        "info",
        `Redirect count: ${res.redirectCount}, preserved domain '${initialDomain}'`
      );
    }
  } catch (err: unknown) {
    // If HTTP port 80 fails to connect or times out
    httpToHttpsFinding = createFinding(
      "SITE_HTTP_TO_HTTPS",
      "warn",
      "medium",
      `Plain HTTP port 80 could not be reached or timed out: ${(err as Error).message}`,
      "Ensure port 80 is listening and issuing 301 redirects to HTTPS."
    );

    redirectsFinding = createFinding(
      "SITE_REDIRECTS",
      "not_assessed",
      "info",
      `Redirect chain could not be evaluated because HTTP connection failed: ${(err as Error).message}`
    );
  }

  return { httpToHttpsFinding, redirectsFinding };
}
