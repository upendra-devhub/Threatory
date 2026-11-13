import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { syncAllFeeds } from "../modules/feeds/syncService.js";

async function main() {
  console.log("Connecting to MongoDB...");
  await connectDatabase();

  console.log("Starting manual threat intelligence feed synchronization...");
  try {
    const summary = await syncAllFeeds();
    console.log("Feed synchronization completed at:", summary.timestamp);
    console.log(`Total entries synchronized: ${summary.totalSynced}`);
    for (const result of summary.results) {
      console.log(
        `  - [${result.feed}] ${result.success ? "SUCCESS" : "FAILED"}: ${result.count} entries${
          result.error ? ` (error: ${result.error})` : ""
        }`
      );
    }
  } catch (error) {
    console.error("Feed synchronization encountered error:", (error as Error).message);
  } finally {
    await disconnectDatabase();
    console.log("Disconnected from MongoDB.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error during feed sync script:", err);
    process.exit(1);
  });
