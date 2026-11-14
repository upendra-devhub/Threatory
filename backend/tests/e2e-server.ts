import { MongoMemoryServer } from "mongodb-memory-server";
import type { Server } from "node:http";

export interface E2EServerInstance {
  server: Server;
  mongod: MongoMemoryServer;
  port: number;
  stop: () => Promise<void>;
}

export async function startE2EServer(portOverride?: number): Promise<E2EServerInstance> {
  const port = portOverride ?? Number(process.env.PORT || 4001);
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

  // Start in-memory MongoDB instance
  const mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();

  // Configure test environment before importing backend modules
  process.env.NODE_ENV = "test";
  process.env.PORT = String(port);
  process.env.MONGODB_URI = mongoUri;
  process.env.FRONTEND_ORIGIN = frontendOrigin;
  process.env.COOKIE_SECRET = "test_cookie_secret_at_least_32_characters_long_for_e2e";
  process.env.DISABLE_RATE_LIMIT = "true";
  // Ensure DEV_OWNER_ID is not set by default so real anonymous tid cookies are issued
  if (!process.env.DEV_OWNER_ID) {
    delete process.env.DEV_OWNER_ID;
  }

  // Dynamically import Mongoose and Express app after environment is configured
  const { default: mongoose } = await import("mongoose");
  const { app } = await import("../src/app.js");
  const { Scan } = await import("../src/models/scan.js");

  await mongoose.connect(mongoUri);
  await Scan.init();

  const server = app.listen(port, () => {
    console.log(`[E2E-BACKEND] Ready on port ${port} (MongoDB memory URI: ${mongoUri})`);
  });

  const stop = async (): Promise<void> => {
    return new Promise((resolve) => {
      server.close(async () => {
        try {
          await mongoose.disconnect();
          await mongod.stop();
          console.log("[E2E-BACKEND] Cleanly shut down");
        } catch (err) {
          console.error("[E2E-BACKEND] Error during shutdown:", err);
        }
        resolve();
      });
    });
  };

  return { server, mongod, port, stop };
}

// If executed directly as CLI script
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("e2e-server.ts") || process.argv[1].endsWith("e2e-server.js"));

if (isDirectExecution) {
  startE2EServer()
    .then((instance) => {
      console.log("E2E_SERVER_READY");

      const handleSignal = async () => {
        console.log("[E2E-BACKEND] Received shutdown signal");
        await instance.stop();
        process.exit(0);
      };

      process.on("SIGINT", handleSignal);
      process.on("SIGTERM", handleSignal);
    })
    .catch((err) => {
      console.error("[E2E-BACKEND] Startup failure:", err);
      process.exit(1);
    });
}
