import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { getDomain } from "tldts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANCO_ZIP_URL = "https://tranco-list.eu/top-1m.csv.zip";
const DATA_DIR = path.resolve(__dirname, "../../data");
const FIXTURES_DIR = path.resolve(__dirname, "../../tests/fixtures");
const OUTPUT_FILE = path.join(DATA_DIR, "top-domains.txt");
const FIXTURE_FILE = path.join(FIXTURES_DIR, "top-domains-200.txt");

const TARGET_DOMAIN_COUNT = 10000;
const FIXTURE_DOMAIN_COUNT = 200;

/**
 * Extracts the first deflated file from a standard PKZIP archive buffer.
 */
function extractZip(buf: Buffer): Buffer {
  if (buf.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("Invalid ZIP archive header");
  }

  const compressionMethod = buf.readUInt16LE(8);
  const compressedSize = buf.readUInt32LE(18);
  const fileNameLen = buf.readUInt16LE(26);
  const extraFieldLen = buf.readUInt16LE(28);

  const dataStart = 30 + fileNameLen + extraFieldLen;
  const compressedData = buf.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    return compressedData;
  }
  if (compressionMethod === 8) {
    return zlib.inflateRawSync(compressedData);
  }

  throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
}

export async function downloadAndProcessTranco(
  targetCount = TARGET_DOMAIN_COUNT,
  fixtureCount = FIXTURE_DOMAIN_COUNT
): Promise<{ topDomainsCount: number; fixtureCount: number }> {
  console.log(`Downloading Tranco list from ${TRANCO_ZIP_URL}...`);
  const response = await fetch(TRANCO_ZIP_URL);
  if (!response.ok) {
    throw new Error(`Failed to download Tranco list: HTTP ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuffer);

  console.log("Decompressing Tranco CSV...");
  const csvBuffer = extractZip(zipBuffer);
  const csvContent = csvBuffer.toString("utf-8");

  console.log("Parsing registrable domains...");
  const lines = csvContent.split(/\r?\n/);
  const uniqueDomains = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) continue;

    const rawDomain = line.slice(commaIndex + 1).trim().toLowerCase();
    if (!rawDomain) continue;

    const registrable = getDomain(rawDomain) || rawDomain;
    if (registrable && !uniqueDomains.has(registrable)) {
      uniqueDomains.add(registrable);
      if (uniqueDomains.size >= targetCount) {
        break;
      }
    }
  }

  // Ensure critical brand domains for golden inputs and security checks are present
  const mandatoryDomains = [
    "paypal.com",
    "google.com",
    "apple.com",
    "microsoft.com",
    "amazon.com",
    "facebook.com",
    "netflix.com",
    "github.com",
    "twitter.com",
    "linkedin.com",
  ];
  for (const brand of mandatoryDomains) {
    uniqueDomains.add(brand);
  }

  const domainList = Array.from(uniqueDomains).slice(0, targetCount);

  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  // Write top-domains.txt
  fs.writeFileSync(OUTPUT_FILE, domainList.join("\n") + "\n", "utf-8");
  console.log(`Saved ${domainList.length} top domains to ${OUTPUT_FILE}`);

  // Write top-domains-200.txt fixture
  const fixtureList = domainList.slice(0, fixtureCount);
  // Ensure paypal.com is in fixture list for U5 test
  if (!fixtureList.includes("paypal.com")) {
    fixtureList[fixtureList.length - 1] = "paypal.com";
  }
  fs.writeFileSync(FIXTURE_FILE, fixtureList.join("\n") + "\n", "utf-8");
  console.log(`Saved ${fixtureList.length} domains to test fixture ${FIXTURE_FILE}`);

  return {
    topDomainsCount: domainList.length,
    fixtureCount: fixtureList.length,
  };
}

// Direct execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  downloadAndProcessTranco()
    .then(({ topDomainsCount, fixtureCount }) => {
      console.log(`Tranco processing complete: ${topDomainsCount} top domains, ${fixtureCount} fixture domains.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Tranco download failed:", err);
      process.exit(1);
    });
}
