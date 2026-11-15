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
    // Top 5 recent scans (matching the screenshot exactly)
    {
      scanId: "scan-recent-01",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "http://198.51.100.23/login",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 55 },
      createdAt: "2026-11-15T09:41:00.000Z",
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
      targetSummary: "https://example.com/",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-12T11:50:00.000Z",
    },

    // 19 additional scans to bring totals to:
    // URL: 12 total, Privacy: 5 total, Website: 7 total
    // None detected: 9 total, Low: 6 total, Medium: 6 total, High: 3 total
    // --- URL scans (9 remaining) ---
    {
      scanId: "scan-url-006",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://github.com/upendra-devhub",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T16:00:00.000Z",
    },
    {
      scanId: "scan-url-007",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://developer.mozilla.org/en-US/docs",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T15:30:00.000Z",
    },
    {
      scanId: "scan-url-008",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://en.wikipedia.org/wiki/Web_security",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T14:00:00.000Z",
    },
    {
      scanId: "scan-url-009",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://google.com/search?q=threatory",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T12:00:00.000Z",
    },
    {
      scanId: "scan-url-010",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://microsoft.com/en-us",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-11T10:00:00.000Z",
    },
    {
      scanId: "scan-url-011",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "https://cloudflare.com",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-10T15:00:00.000Z",
    },
    {
      scanId: "scan-url-012",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "http://legitimate-blog.org/news",
      assessment: { label: "Low", riskLevel: "low" as const, score: 15 },
      createdAt: "2026-11-10T12:00:00.000Z",
    },
    {
      scanId: "scan-url-013",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "http://internal-portal.local/test",
      assessment: { label: "Low", riskLevel: "low" as const, score: 15 },
      createdAt: "2026-11-09T18:00:00.000Z",
    },
    {
      scanId: "scan-url-014",
      module: "url" as const,
      status: "completed" as const,
      targetSummary: "http://legacy-system.corp.net/admin",
      assessment: { label: "Low", riskLevel: "low" as const, score: 25 },
      createdAt: "2026-11-09T14:00:00.000Z",
    },

    // --- Privacy reviews (4 remaining) ---
    {
      scanId: "scan-priv-005",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "1 profile, text provided (340 characters)",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-14T12:00:00.000Z",
    },
    {
      scanId: "scan-priv-006",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "1 profile, text provided (580 characters)",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-13T16:00:00.000Z",
    },
    {
      scanId: "scan-priv-007",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "3 profiles, text provided (2,100 characters)",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 50 },
      createdAt: "2026-11-13T11:00:00.000Z",
    },
    {
      scanId: "scan-priv-008",
      module: "privacy" as const,
      status: "completed" as const,
      targetSummary: "2 profiles, text provided (950 characters)",
      assessment: { label: "High", riskLevel: "high" as const, score: 85 },
      createdAt: "2026-11-12T17:00:00.000Z",
    },

    // --- Website audits (6 remaining) ---
    {
      scanId: "scan-site-005",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://antigravity.corp",
      assessment: { label: "None detected", riskLevel: "none_detected" as const, score: 0 },
      createdAt: "2026-11-10T10:00:00.000Z",
    },
    {
      scanId: "scan-site-006",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://my-company-security.io",
      assessment: { label: "Low", riskLevel: "low" as const, score: 20 },
      createdAt: "2026-11-09T16:00:00.000Z",
    },
    {
      scanId: "scan-site-007",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://staging-app.example.org",
      assessment: { label: "Low", riskLevel: "low" as const, score: 25 },
      createdAt: "2026-11-09T11:00:00.000Z",
    },
    {
      scanId: "scan-site-008",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://corp-internal.dev",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 45 },
      createdAt: "2026-11-08T15:00:00.000Z",
    },
    {
      scanId: "scan-site-009",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://old-vpn-gateway.net",
      assessment: { label: "Medium", riskLevel: "medium" as const, score: 60 },
      createdAt: "2026-11-08T12:00:00.000Z",
    },
    {
      scanId: "scan-site-010",
      module: "website" as const,
      status: "completed" as const,
      targetSummary: "https://unpatched-portal.example.com",
      assessment: { label: "High", riskLevel: "high" as const, score: 95 },
      createdAt: "2026-11-07T14:00:00.000Z",
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
        scoreMeaning: `Deterministic assessment: ${item.assessment.label}`,
      },
      findings: [
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
      limitations: ["Automated heuristic assessment; non-invasive inspection only."],
      details: {},
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
