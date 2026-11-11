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

  if (!fixturesDir) {
    throw new Error(
      `Could not locate packages/contracts/fixtures from paths: ${possiblePaths.join(", ")}`
    );
  }

  // Clear existing seeded scans for this ownerId
  await Scan.deleteMany({ ownerId }).exec();

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

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDatabase();

    const env = getEnv();
    const ownerId = env.DEV_OWNER_ID || "dev-owner-local-test";
    console.log(`Seeding fixtures for ownerId: ${ownerId}`);

    const seededIds = await runSeed(ownerId);
    console.log(`Successfully seeded ${seededIds.length} scans:`);
    for (const id of seededIds) {
      console.log(`  - ${id}`);
    }

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
