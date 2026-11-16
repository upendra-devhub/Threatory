import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Report } from "@threatory/contracts";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { scanRepository } from "../repositories/scanRepository.js";
import { Scan } from "../models/scan.js";
import { getEnv } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeed(customOwnerId?: string): Promise<string[]> {
  const env = getEnv();
  if (env.NODE_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("Seeding is strictly prohibited in production mode (NODE_ENV=production)");
  }
  const ownerId = customOwnerId || env.DEV_OWNER_ID || "dev-owner-local-test";

  // Clear existing seeded scans for this ownerId
  await Scan.deleteMany({ ownerId }).exec();

  if (customOwnerId === "dev-owner-test-seed") {
    const fixtureFiles = [
      "url-report-completed.json",
      "url-report-partial.json",
      "url-report-failed.json",
      "privacy-report-completed.json",
      "privacy-report-partial.json",
      "privacy-report-failed.json",
      "website-report-completed.json",
      "website-report-partial.json",
      "website-report-failed.json",
    ];

    const possiblePaths = [
      path.resolve(__dirname, "../../../packages/contracts/fixtures"),
      path.resolve(__dirname, "../../packages/contracts/fixtures"),
      path.resolve(process.cwd(), "packages/contracts/fixtures"),
    ];

    let fixturesDir = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fixturesDir = p;
        break;
      }
    }

    if (fixturesDir) {
      const seededIds: string[] = [];
      for (const filename of fixtureFiles) {
        const filePath = path.join(fixturesDir, filename);
        const content = fs.readFileSync(filePath, "utf-8");
        const rawJson = JSON.parse(content) as unknown;
        const report = Report.parse(rawJson);

        await scanRepository.create({
          scanId: report.scanId,
          ownerId,
          module: report.module,
          status: report.status,
          rulesVersion: report.rulesVersion,
          targetSummary: report.targetSummary,
          assessment: report.assessment,
          findings: report.findings,
          limitations: report.limitations,
          details: report.details,
          createdAt: report.createdAt,
        });

        seededIds.push(report.scanId);
      }
      return seededIds;
    }
  }

  const demoScans = [
    // Top 9 scans (matching page 1 of Scan History screenshot exactly)
    {
      scanId: "scan-recent-01",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "http://198.51.100.23/login",
      assessment: {
        label: "Medium",
        riskLevel: "medium" as const,
        score: 52,
        scoreMeaning: "Three rules matched: the host is a raw IP address, the link uses plain HTTP, and the path contains a login keyword.",
      },
      createdAt: "2026-11-15T09:41:00.000Z",
      limitations: [
        "Link not visited",
        "Page content not analysed",
        "Reputation checked against locally stored threat intelligence feeds",
      ],
      details: {
        host: "198.51.100.23",
        scheme: "http",
        path: "/login",
      },
      findings: [
        {
          code: "URL_IP_HOST",
          category: "host",
          title: "Host is an IP address",
          outcome: "fail" as const,
          severity: "high" as const,
          evidence: "host: 198.51.100.23",
          explanation: "Legitimate services rarely ask you to sign in at a bare IP address.",
          recommendation: "Do not visit or authenticate on sites identified only by an IP address unless you explicitly trust the host.",
        },
        {
          code: "URL_NO_HTTPS",
          category: "host",
          title: "Not using HTTPS",
          outcome: "warn" as const,
          severity: "medium" as const,
          evidence: "scheme: http",
          explanation: "The link uses http, so traffic would not be encrypted.",
          recommendation: "Avoid submitting credentials or sensitive information over unencrypted HTTP connections.",
        },
        {
          code: "URL_KEYWORDS",
          category: "host",
          title: "Suspicious keyword in path",
          outcome: "warn" as const,
          severity: "low" as const,
          evidence: "path: /login",
          explanation: "Login-style words are common in credential-harvesting links.",
          recommendation: "Verify domain authenticity before entering credentials or sensitive data.",
        },
        {
          code: "URL_ABUSED_TLD",
          category: "host",
          title: "High-risk TLD",
          outcome: "not_assessed" as const,
          severity: "info" as const,
          evidence: "IP literal has no TLD",
          explanation: "An IP address has no top-level domain, so this rule could not be applied.",
        },
        {
          code: "URL_USERINFO",
          category: "host",
          title: "No embedded credentials",
          outcome: "pass" as const,
          severity: "info" as const,
          evidence: "No credentials embedded",
          explanation: "No user information was found before the host.",
        },
        {
          code: "URL_NONSTANDARD_PORT",
          category: "host",
          title: "Standard network port",
          outcome: "pass" as const,
          severity: "info" as const,
          evidence: "Standard port 80",
          explanation: "Standard network port is used for HTTP protocol.",
        },
        {
          code: "URL_LONG",
          category: "host",
          title: "Concise URL length",
          outcome: "pass" as const,
          severity: "info" as const,
          evidence: "26 characters",
          explanation: "URL length is within standard concise limits.",
        },
        {
          code: "URL_ENCODED",
          category: "host",
          title: "Standard percent-encoding",
          outcome: "pass" as const,
          severity: "info" as const,
          evidence: "No encoding anomalies",
          explanation: "No suspicious percent-encoding anomalies detected.",
        },
        {
          code: "URL_REDIRECT_PARAM",
          category: "host",
          title: "No open redirect parameter",
          outcome: "pass" as const,
          severity: "info" as const,
          evidence: "No redirect params",
          explanation: "Query string does not contain suspicious redirect parameters.",
        },
        {
          code: "URL_EXCESS_SUBDOMAINS",
          category: "host",
          title: "Standard subdomain hierarchy",
          outcome: "pass" as const,
          severity: "info" as const,
          evidence: "0 subdomains",
          explanation: "Subdomain hierarchy depth is within normal bounds.",
        },
        {
          code: "URL_SHORTENER",
          category: "host",
          title: "Not a known URL shortener",
          outcome: "pass" as const,
          severity: "info" as const,
          evidence: "Not shortened",
          explanation: "Host is not listed in the URL shortener registry.",
        },
      ],
    },
    {
      scanId: "scan-recent-02",
      module: "website" as const,
      status: "partial" as const,
      targetSummary: "https://example.com",
      assessment: { label: "Low", riskLevel: "low" as const, score: 20 },
      createdAt: "2026-11-15T09:12:00.000Z",
    },
    {
      scanId: "scan-recent-03",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "2 profiles, text provided (1,204 characters)",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 45 },
      createdAt: "2026-11-14T18:03:00.000Z",
    },
    {
      scanId: "scan-recent-04",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://paypa1.com/login",
      assessment: { label: "High", riskLevel: "high" as const, score: 90 },
      createdAt: "2026-11-14T16:27:00.000Z",
    },
    {
      scanId: "scan-recent-05",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://paypal.com@example.net/login",
      assessment: { label: "High", riskLevel: "high" as const, score: 90 },
      createdAt: "2026-11-14T10:05:00.000Z",
    },
    {
      scanId: "scan-recent-06",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://example.org",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-13T15:48:00.000Z",
    },
    {
      scanId: "scan-recent-07",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "3 profiles, no text",
      assessment: { label: "Low", riskLevel: "low" as const, score: 20 },
      createdAt: "2026-11-13T09:20:00.000Z",
    },
    {
      scanId: "scan-recent-08",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://bit.ly.example-login.xyz/verify",
      assessment: { label: "High", riskLevel: "high" as const, score: 90 },
      createdAt: "2026-11-12T14:02:00.000Z",
    },
    {
      scanId: "scan-recent-09",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://example.com/",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-12T11:50:00.000Z",
    },

    // 15 additional scans to bring totals to exactly:
    // URL: 12, Privacy: 5, Website: 7 (Total 24)
    // None detected: 9, Low: 6, Medium: 6, High: 3 (Total 24)
    // Remaining URL: 7 items (5 None detected, 2 Low)
    {
      scanId: "scan-url-010",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://github.com/upendra-devhub",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T18:00:00.000Z",
    },
    {
      scanId: "scan-url-011",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://developer.mozilla.org/en-US/docs",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T15:00:00.000Z",
    },
    {
      scanId: "scan-url-012",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://en.wikipedia.org/wiki/Web_security",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T12:00:00.000Z",
    },
    {
      scanId: "scan-url-013",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://google.com/search?q=threatory",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T09:00:00.000Z",
    },
    {
      scanId: "scan-url-014",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://microsoft.com/en-us",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-10T16:00:00.000Z",
    },
    {
      scanId: "scan-url-015",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "http://legitimate-blog.org/news",
      assessment: { label: "Low", riskLevel: "low" as const, score: 15 },
      createdAt: "2026-11-10T12:00:00.000Z",
    },
    {
      scanId: "scan-url-016",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "http://internal-portal.local/test",
      assessment: { label: "Low", riskLevel: "low" as const, score: 15 },
      createdAt: "2026-11-09T18:00:00.000Z",
    },

    // Remaining Privacy: 3 items (2 None detected, 1 Medium)
    {
      scanId: "scan-priv-005",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "1 profile, text provided (340 characters)",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T16:00:00.000Z",
    },
    {
      scanId: "scan-priv-006",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "1 profile, text provided (580 characters)",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-10T14:00:00.000Z",
    },
    {
      scanId: "scan-priv-007",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "3 profiles, text provided (2,100 characters)",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 50 },
      createdAt: "2026-11-09T11:00:00.000Z",
    },

    // Remaining Website: 5 items (2 Low, 3 Medium)
    {
      scanId: "scan-site-005",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://my-company-security.io",
      assessment: { label: "Low", riskLevel: "low" as const, score: 20 },
      createdAt: "2026-11-11T14:00:00.000Z",
    },
    {
      scanId: "scan-site-006",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://staging-app.example.org",
      assessment: { label: "Low", riskLevel: "low" as const, score: 25 },
      createdAt: "2026-11-10T10:00:00.000Z",
    },
    {
      scanId: "scan-site-007",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://corp-internal.dev",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 45 },
      createdAt: "2026-11-09T16:00:00.000Z",
    },
    {
      scanId: "scan-site-008",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://old-vpn-gateway.net",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 60 },
      createdAt: "2026-11-08T15:00:00.000Z",
    },
    {
      scanId: "scan-site-009",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://unpatched-portal.example.com",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 60 },
      createdAt: "2026-11-08T12:00:00.000Z",
    },
  ];

  const seededIds: string[] = [];

  for (const item of demoScans) {
    const report = Report.parse({
      scanId: item.scanId,
      module: item.module,
      status: item.status,
      rulesVersion: `${item.module}-1.0.0`,
      targetSummary: item.targetSummary,
      assessment: {
        riskLevel: item.assessment.riskLevel,
        label: item.assessment.label,
        score: item.assessment.score,
        scoreMeaning:
          (item.assessment as unknown as { scoreMeaning?: string }).scoreMeaning ||
          `Deterministic assessment: ${item.assessment.label}`,
      },
      findings: (item as unknown as { findings?: typeof item.findings }).findings || [
        {
          code: "DEMO_FINDING",
          category: "General",
          title: "Assessment Finding",
          outcome: item.assessment.riskLevel === "none_detected" ? "pass" : "warn",
          severity:
            item.assessment.riskLevel === "none_detected"
              ? "info"
              : item.assessment.riskLevel,
          evidence: "Automated scan finding evidence",
          explanation: "Explanation of findings and risks",
          recommendation: "Review configuration and follow security recommendations",
        },
      ],
      limitations: (item as unknown as { limitations?: string[] }).limitations || [
        "Automated heuristic assessment; non-invasive inspection only.",
      ],
      details: (item as unknown as { details?: Record<string, unknown> }).details || {},
      createdAt: item.createdAt,
    });

    await scanRepository.create({
      scanId: report.scanId,
      ownerId,
      module: report.module,
      status: report.status,
      rulesVersion: report.rulesVersion,
      targetSummary: report.targetSummary,
      assessment: report.assessment,
      findings: report.findings,
      limitations: report.limitations,
      details: report.details,
      createdAt: report.createdAt,
    });

    seededIds.push(report.scanId);
  }

  return seededIds;
}

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDatabase();

    const env = getEnv();
    const ownerId = env.DEV_OWNER_ID || "dev-owner-local-test";
    console.log(`Seeding demo scans for ownerId: ${ownerId}`);

    const seededIds = await runSeed(ownerId);
    console.log(`Successfully seeded ${seededIds.length} scans matching the dashboard screenshot.`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Seed script failed:", (error as Error).message);
    process.exit(1);
  }
}

// Only auto-run main if executed directly via node CLI
if (process.env.NODE_ENV !== "test") {
  main();
}
