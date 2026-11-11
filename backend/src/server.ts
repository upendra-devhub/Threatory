import { validateEnv } from "./config/env.js";
import { app } from "./app.js";

export function startServer(): void {
  try {
    const env = validateEnv();
    const server = app.listen(env.PORT, () => {
      console.log(`Threatory backend listening on port ${env.PORT}`);
    });

    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

// Start server if executed directly
if (process.env.NODE_ENV !== "test") {
  startServer();
}
