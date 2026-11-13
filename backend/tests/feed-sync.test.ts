import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { FeedEntry } from "../src/models/feedEntry.js";
import { FeedSyncMeta } from "../src/models/feedSyncMeta.js";
import {
  syncOpenPhish,
  syncUrlhaus,
  syncAllFeeds,
  getLastFeedSyncTime,
} from "../src/modules/feeds/syncService.js";
import { startFeedScheduler, stopFeedScheduler } from "../src/modules/feeds/scheduler.js";

describe("Threat Intelligence Feed Synchronization (CP-06 Task 3)", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FeedEntry.deleteMany({}).exec();
    await FeedSyncMeta.deleteMany({}).exec();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    stopFeedScheduler();
  });

  describe("OpenPhish Synchronization", () => {
    it("fetches, parses, and idempotently upserts URLs and hosts into FeedEntry", async () => {
      const mockFeedText = [
        "https://evil-phish.com/login.html",
        "http://credential-stealer.xyz/account",
        "# comment line",
        "",
        "https://evil-phish.com/another-path",
      ].join("\n");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(mockFeedText, {
          status: 200,
          headers: { "content-length": String(Buffer.byteLength(mockFeedText)) },
        })
      );

      const result = await syncOpenPhish("https://mock-openphish.test/feed.txt");
      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);

      // Verify entries in FeedEntry
      const urlEntries = await FeedEntry.find({ source: "openphish" }).exec();
      expect(urlEntries.length).toBeGreaterThan(0);

      const targets = urlEntries.map((e) => e.target);
      expect(targets).toContain("evil-phish.com");
      expect(targets).toContain("credential-stealer.xyz");

      // Verify metadata
      const meta = await FeedSyncMeta.findOne({ feed: "openphish" }).exec();
      expect(meta).not.toBeNull();
      expect(meta?.status).toBe("success");
      expect(meta?.recordsCount).toBe(result.count);
      expect(meta?.lastSuccessAt).toBeDefined();
    });

    it("fails safely without throwing when network is disabled or fetch fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("getaddrinfo ENOTFOUND openphish.com")
      );

      const result = await syncOpenPhish("https://mock-openphish.test/feed.txt");
      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toContain("ENOTFOUND");

      // Verify failure recorded in metadata
      const meta = await FeedSyncMeta.findOne({ feed: "openphish" }).exec();
      expect(meta).not.toBeNull();
      expect(meta?.status).toBe("failed");
      expect(meta?.error).toContain("ENOTFOUND");
    });

    it("enforces 10MB size limit and safely rejects oversized feeds", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("dummy", {
          status: 200,
          headers: { "content-length": "15000000" }, // 15 MB
        })
      );

      const result = await syncOpenPhish("https://mock-openphish.test/feed.txt");
      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum limit");
    });
  });

  describe("URLhaus Synchronization", () => {
    it("handles URLhaus response and stores entries", async () => {
      const mockCsv = [
        "# URLhaus database dump",
        "1,2026-11-13,http://malware-dist.net/payload.exe,online,malware_download",
      ].join("\n");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(mockCsv, { status: 200 })
      );

      const result = await syncUrlhaus("https://mock-urlhaus.test/export.csv");
      expect(result.success).toBe(true);

      const entries = await FeedEntry.find({ source: "urlhaus" }).exec();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((e) => e.target.includes("malware-dist.net"))).toBe(true);
    });

    it("handles 410 / 401 gracefully without failing the system", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Gone", { status: 410, statusText: "Gone" })
      );

      const result = await syncUrlhaus("https://mock-urlhaus.test/export.csv");
      expect(result.success).toBe(false);
      expect(result.error).toContain("HTTP error 410");
    });
  });

  describe("syncAllFeeds & getLastFeedSyncTime", () => {
    it("aggregates sync results across all feeds and reports last sync time", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response("https://phish1.com/\nhttps://phish2.com/\n", { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response("https://malware1.com/\n", { status: 200 })
        );

      const summary = await syncAllFeeds();
      expect(summary.results).toHaveLength(2);
      expect(summary.totalSynced).toBeGreaterThan(0);

      const lastSync = await getLastFeedSyncTime();
      expect(lastSync).not.toBeNull();
      expect(typeof lastSync).toBe("string");
    });
  });

  describe("Scheduler Safeguards", () => {
    it("does not start scheduler in test environment or when disabled", () => {
      const task = startFeedScheduler();
      expect(task).toBeNull();
    });
  });
});
