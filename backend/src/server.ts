
import { validateEnv } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { app } from "./app.js";

export async function startServer(): Promise<void> {
  try {
    const env = validateEnv();

    // Connect to MongoDB before accepting requests
    await connectDatabase();
    console.log("MongoDB connected successfully");

    const server = app.listen(env.PORT, () => {
      console.log(`Threatory backend listening on port ${env.PORT}`);
    });

    const shutdown = () => {
      server.close(async () => {
        try {
          await disconnectDatabase();
          console.log("MongoDB disconnected");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Server startup failed:", (error as Error).message);
    process.exit(1);
  }
}

// Start server if executed directly
if (process.env.NODE_ENV !== "test") {
  void startServer();
}
