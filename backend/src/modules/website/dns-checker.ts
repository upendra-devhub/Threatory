import dns from "node:dns";
import { getDomain } from "tldts";
import { Finding } from "@threatory/contracts";
import { WEBSITE_RULES } from "./rules.config.js";

export interface EmailDnsResolver {
  resolveTxt: (hostname: string) => Promise<string[][]>;
  resolveCaa: (hostname: string) => Promise<dns.CaaRecord[]>;
}

export function createDefaultEmailDnsResolver(): EmailDnsResolver {
  return {
    resolveTxt: (hostname: string) => dns.promises.resolveTxt(hostname),
    resolveCaa: (hostname: string) => dns.promises.resolveCaa(hostname),
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
    category: "dns",
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

export interface EmailDnsCheckResults {
  findings: Finding[];
}

/**
 * Checks email-related DNS records (SPF, DMARC, CAA) on the registrable domain.
 */
export async function checkEmailDns(
  targetUrl: URL,
  resolver: EmailDnsResolver = createDefaultEmailDnsResolver()
): Promise<EmailDnsCheckResults> {
  const hostname = targetUrl.hostname;
  const domain = getDomain(hostname) || hostname;
  const findings: Finding[] = [];

  // 1. SITE_SPF (TXT on domain with v=spf1)
  try {
    const txtRecords = await resolver.resolveTxt(domain);
    const flattened = txtRecords.map((chunk) => chunk.join(""));
    const spfRecord = flattened.find((r) => r.trim().toLowerCase().startsWith("v=spf1"));

    if (!spfRecord) {
      findings.push(
        createFinding(
          "SITE_SPF",
          "warn",
          "medium",
          `No SPF record published for domain '${domain}'`
        )
      );
    } else {
      const isWeak = /(?:\s|^)[+?]all(?:\s|$)/i.test(spfRecord);
      if (isWeak) {
        findings.push(
          createFinding(
            "SITE_SPF",
            "warn",
            "medium",
            `SPF record ends with permissive or neutral qualifier: '${spfRecord}'`,
            "Update SPF record to end with hard-fail '-all' or soft-fail '~all' to prevent email spoofing."
          )
        );
      } else {
        findings.push(
          createFinding(
            "SITE_SPF",
            "pass",
            "info",
            `Valid SPF record configured: '${spfRecord}'`
          )
        );
      }
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENODATA" || code === "ENOTFOUND") {
      findings.push(
        createFinding(
          "SITE_SPF",
          "warn",
          "medium",
          `No SPF record published for domain '${domain}'`
        )
      );
    } else {
      findings.push(
        createFinding(
          "SITE_SPF",
          "not_assessed",
          "info",
          `SPF DNS lookup failed: ${(err as Error).message}`
        )
      );
    }
  }

  // 2. SITE_DMARC (TXT on _dmarc.domain with v=DMARC1)
  try {
    const dmarcHost = `_dmarc.${domain}`;
    const txtRecords = await resolver.resolveTxt(dmarcHost);
    const flattened = txtRecords.map((chunk) => chunk.join(""));
    const dmarcRecord = flattened.find((r) => r.trim().toUpperCase().startsWith("V=DMARC1"));

    if (!dmarcRecord) {
      findings.push(
        createFinding(
          "SITE_DMARC",
          "warn",
          "medium",
          `No DMARC record found at '${dmarcHost}'`
        )
      );
    } else {
      const policyMatch = dmarcRecord.match(/p\s*=\s*([^;\s]+)/i);
      const policy = policyMatch && policyMatch[1] ? policyMatch[1].toLowerCase() : "";

      if (policy === "none" || !policy) {
        findings.push(
          createFinding(
            "SITE_DMARC",
            "warn",
            "low",
            `DMARC policy is set to monitor-only (p=none): '${dmarcRecord}'`,
            "Advance DMARC policy from 'p=none' to 'p=quarantine' or 'p=reject' to actively block unauthorized mail."
          )
        );
      } else {
        findings.push(
          createFinding(
            "SITE_DMARC",
            "pass",
            "info",
            `DMARC policy actively enforced (${policy}): '${dmarcRecord}'`
          )
        );
      }
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENODATA" || code === "ENOTFOUND") {
      findings.push(
        createFinding(
          "SITE_DMARC",
          "warn",
          "medium",
          `No DMARC record found at '_dmarc.${domain}'`
        )
      );
    } else {
      findings.push(
        createFinding(
          "SITE_DMARC",
          "not_assessed",
          "info",
          `DMARC DNS lookup failed: ${(err as Error).message}`
        )
      );
    }
  }

  // 3. SITE_CAA (CAA on domain)
  try {
    const caaRecords = await resolver.resolveCaa(domain);
    if (!caaRecords || caaRecords.length === 0) {
      findings.push(
        createFinding(
          "SITE_CAA",
          "warn",
          "low",
          `No CAA records published for domain '${domain}'`
        )
      );
    } else {
      const summary = caaRecords
        .map((r) => `${r.issue || r.issuewild || r.iodef}`)
        .filter(Boolean)
        .join(", ");
      findings.push(
        createFinding(
          "SITE_CAA",
          "pass",
          "info",
          `CAA records configured: ${summary || "CAA published"}`
        )
      );
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENODATA" || code === "ENOTFOUND") {
      findings.push(
        createFinding(
          "SITE_CAA",
          "warn",
          "low",
          `No CAA records published for domain '${domain}'`
        )
      );
    } else {
      findings.push(
        createFinding(
          "SITE_CAA",
          "not_assessed",
          "info",
          `CAA DNS lookup failed: ${(err as Error).message}`
        )
      );
    }
  }

  return { findings };
}
