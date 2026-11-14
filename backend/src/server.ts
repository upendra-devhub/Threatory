
import { validateEnv } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { app } from "./app.js";
import { startFeedScheduler, stopFeedScheduler } from "./modules/feeds/scheduler.js";
import { logger } from "./middleware/logger.js";

export async function startServer(): Promise<void> {
  try {
    const env = validateEnv();

    // Connect to MongoDB before accepting requests
    await connectDatabase();
    logger.info("MongoDB connected successfully");

    // Start daily feed synchronization scheduler if enabled
    startFeedScheduler();

    const server = app.listen(env.PORT, () => {
      logger.info(`Threatory backend listening on port ${env.PORT}`);
    });

    let isShuttingDown = false;

    const shutdown = (signal: string) => {
      if (isShuttingDown) {
        logger.warn(`Shutdown already in progress, ignoring duplicate ${signal}`);
        return;
      }
      isShuttingDown = true;
      logger.info(`Received ${signal}, initiating graceful shutdown...`);

      const forceExitTimer = setTimeout(() => {
        logger.error("Graceful shutdown timed out after 10s, forcing exit");
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      stopFeedScheduler();

      server.close(async () => {
        try {
          logger.info("HTTP server closed, disconnecting MongoDB...");
          await disconnectDatabase();
          logger.info("MongoDB disconnected cleanly");
          clearTimeout(forceExitTimer);
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, "Error during MongoDB disconnection");
          clearTimeout(forceExitTimer);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error({ err: error }, `Server startup failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Start server if executed directly
if (process.env.NODE_ENV !== "test") {
  void startServer();
}
