import cron, { ScheduledTask } from "node-cron";
import { getEnv } from "../../config/env.js";
import { logger } from "../../middleware/logger.js";
import { syncAllFeeds } from "./syncService.js";

let scheduledTask: ScheduledTask | null = null;

/**
 * Starts the daily feed synchronization cron job if FEEDS_SYNC_ENABLED is true.
 */
export function startFeedScheduler(): ScheduledTask | null {
  const env = getEnv();

  if (!env.FEEDS_SYNC_ENABLED) {
    logger.info("Feed synchronization cron is disabled (FEEDS_SYNC_ENABLED=false)");
    return null;
  }

  if (env.NODE_ENV === "test") {
    logger.info("Feed synchronization cron skipped in test environment");
    return null;
  }

  if (scheduledTask) {
    return scheduledTask;
  }

  // Daily at 03:00 AM
  const cronSchedule = "0 3 * * *";
  logger.info({ cronSchedule }, "Registering daily threat intelligence feed sync cron job");

  scheduledTask = cron.schedule(cronSchedule, async () => {
    logger.info("Starting scheduled daily threat feed synchronization");
    try {
      const summary = await syncAllFeeds();
      logger.info(
        { totalSynced: summary.totalSynced, timestamp: summary.timestamp },
        "Scheduled threat feed synchronization completed"
      );
    } catch (err) {
      logger.error(
        { error: (err as Error).message },
        "Unexpected error during scheduled threat feed synchronization"
      );
    }
  });

  return scheduledTask;
}

/**
 * Stops the scheduled cron task if active.
 */
export function stopFeedScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("Feed synchronization cron job stopped");
  }
}
