import { FeedEntry } from "../../models/feedEntry.js";
import { FeedSyncMeta } from "../../models/feedSyncMeta.js";
import { logger } from "../../middleware/logger.js";
import { getEnv } from "../../config/env.js";
import { normaliseUrl } from "../url/normalise.js";

const MAX_FEED_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const FETCH_TIMEOUT_MS = 15000; // 15s timeout
const BULK_CHUNK_SIZE = 500;

export interface FeedSyncResult {
  feed: string;
  success: boolean;
  count: number;
  error?: string;
}

export interface SyncAllFeedsResult {
  timestamp: string;
  results: FeedSyncResult[];
  totalSynced: number;
}

interface ParsedEntry {
  target: string;
  targetType: "url" | "host";
  source: "openphish" | "urlhaus";
}

/**
 * Downloads text feed with strict size and timeout enforcement.
 */
async function fetchFeedText(
  url: string,
  headers: Record<string, string> = {}
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FEED_SIZE_BYTES) {
      throw new Error(
        `Feed size ${contentLength} exceeds maximum limit of ${MAX_FEED_SIZE_BYTES} bytes`
      );
    }

    const text = await response.text();
    if (Buffer.byteLength(text, "utf-8") > MAX_FEED_SIZE_BYTES) {
      throw new Error(
        `Feed payload size exceeds maximum limit of ${MAX_FEED_SIZE_BYTES} bytes`
      );
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parses line-delimited URLs into distinct URL and host entries.
 */
function parseUrlLines(
  rawText: string,
  source: "openphish" | "urlhaus"
): ParsedEntry[] {
  const lines = rawText.split(/\r?\n/);
  const seenTargets = new Set<string>();
  const entries: ParsedEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Handle CSV lines if present (e.g. URLhaus CSV format)
    let urlCandidate = line;
    if (line.includes(",") && !line.startsWith("http")) {
      const parts = line.split(",");
      const found = parts.find((p) => p.startsWith("http://") || p.startsWith("https://"));
      if (found) {
        urlCandidate = found.replace(/^["']|["']$/g, "").trim();
      }
    }

    try {
      const norm = normaliseUrl(urlCandidate);
      const urlTarget = norm.original.toLowerCase();
      const hostTarget = norm.host.toLowerCase();

      if (!seenTargets.has(urlTarget)) {
        seenTargets.add(urlTarget);
        entries.push({
          target: urlTarget,
          targetType: "url",
          source,
        });
      }

      if (!seenTargets.has(hostTarget)) {
        seenTargets.add(hostTarget);
        entries.push({
          target: hostTarget,
          targetType: "host",
          source,
        });
      }
    } catch {
      // Ignore unparseable individual URL lines safely
      continue;
    }
  }

  return entries;
}

/**
 * Idempotently saves entries in bulk batches.
 */
async function saveEntries(entries: ParsedEntry[]): Promise<number> {
  const now = new Date();
  let totalSaved = 0;

  for (let i = 0; i < entries.length; i += BULK_CHUNK_SIZE) {
    const chunk = entries.slice(i, i + BULK_CHUNK_SIZE);
    const operations = chunk.map((entry) => ({
      updateOne: {
        filter: { target: entry.target, source: entry.source },
        update: {
          $set: {
            lastSeen: now,
            active: true,
          },
          $setOnInsert: {
            target: entry.target,
            targetType: entry.targetType,
            source: entry.source,
            firstSeen: now,
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await FeedEntry.bulkWrite(operations, { ordered: false });
      totalSaved += operations.length;
    }
  }

  return totalSaved;
}

/**
 * Synchronizes OpenPhish community feed.
 */
export async function syncOpenPhish(feedUrl?: string): Promise<FeedSyncResult> {
  const env = getEnv();
  const targetUrl = feedUrl || env.OPENPHISH_FEED_URL || "https://openphish.com/feed.txt";
  const now = new Date();

  logger.info({ targetUrl }, "Starting OpenPhish feed synchronization");

  try {
    const rawText = await fetchFeedText(targetUrl);
    const entries = parseUrlLines(rawText, "openphish");
    const savedCount = await saveEntries(entries);

    await FeedSyncMeta.findOneAndUpdate(
      { feed: "openphish" },
      {
        feed: "openphish",
        lastAttemptAt: now,
        lastSuccessAt: now,
        status: "success",
        recordsCount: savedCount,
        error: undefined,
      },
      { upsert: true }
    ).exec();

    logger.info({ count: savedCount }, "OpenPhish feed synchronized successfully");
    return {
      feed: "openphish",
      success: true,
      count: savedCount,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.warn({ error: errorMessage }, "OpenPhish feed synchronization failed safely");

    await FeedSyncMeta.findOneAndUpdate(
      { feed: "openphish" },
      {
        feed: "openphish",
        lastAttemptAt: now,
        status: "failed",
        error: errorMessage,
      },
      { upsert: true }
    ).exec();

    return {
      feed: "openphish",
      success: false,
      count: 0,
      error: errorMessage,
    };
  }
}

/**
 * Synchronizes URLhaus feed with auth key support and graceful keyless fallback.
 */
export async function syncUrlhaus(feedUrl?: string): Promise<FeedSyncResult> {
  const env = getEnv();
  const targetUrl =
    feedUrl ||
    env.URLHAUS_FEED_URL ||
    (env.URLHAUS_AUTH_KEY
      ? `https://urlhaus-api.abuse.ch/v2/files/exports/${env.URLHAUS_AUTH_KEY}/recent.csv`
      : "https://urlhaus.abuse.ch/downloads/text_online/");
  const now = new Date();

  logger.info({ targetUrl }, "Starting URLhaus feed synchronization");

  const headers: Record<string, string> = {};
  if (env.URLHAUS_AUTH_KEY) {
    headers["Auth-Key"] = env.URLHAUS_AUTH_KEY;
  }

  try {
    const rawText = await fetchFeedText(targetUrl, headers);
    const entries = parseUrlLines(rawText, "urlhaus");
    const savedCount = await saveEntries(entries);

    await FeedSyncMeta.findOneAndUpdate(
      { feed: "urlhaus" },
      {
        feed: "urlhaus",
        lastAttemptAt: now,
        lastSuccessAt: now,
        status: "success",
        recordsCount: savedCount,
        error: undefined,
      },
      { upsert: true }
    ).exec();

    logger.info({ count: savedCount }, "URLhaus feed synchronized successfully");
    return {
      feed: "urlhaus",
      success: true,
      count: savedCount,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.warn({ error: errorMessage }, "URLhaus feed synchronization failed safely");

    await FeedSyncMeta.findOneAndUpdate(
      { feed: "urlhaus" },
      {
        feed: "urlhaus",
        lastAttemptAt: now,
        status: "failed",
        error: errorMessage,
      },
      { upsert: true }
    ).exec();

    return {
      feed: "urlhaus",
      success: false,
      count: 0,
      error: errorMessage,
    };
  }
}

/**
 * Synchronizes all configured threat intelligence feeds.
 */
export async function syncAllFeeds(options?: {
  openphishUrl?: string;
  urlhausUrl?: string;
}): Promise<SyncAllFeedsResult> {
  const results: FeedSyncResult[] = [];

  const openphishRes = await syncOpenPhish(options?.openphishUrl);
  results.push(openphishRes);

  const urlhausRes = await syncUrlhaus(options?.urlhausUrl);
  results.push(urlhausRes);

  const totalSynced = results.reduce((acc, r) => acc + (r.success ? r.count : 0), 0);

  return {
    timestamp: new Date().toISOString(),
    results,
    totalSynced,
  };
}

/**
 * Retrieves the timestamp of the latest successful feed sync.
 */
export async function getLastFeedSyncTime(): Promise<string | null> {
  try {
    const metas = await FeedSyncMeta.find({ status: "success" })
      .sort({ lastSuccessAt: -1 })
      .limit(1)
      .exec();

    if (metas.length > 0 && metas[0]?.lastSuccessAt) {
      return metas[0].lastSuccessAt.toISOString();
    }
  } catch {
    // Database might not be connected or collection empty
  }
  return null;
}
