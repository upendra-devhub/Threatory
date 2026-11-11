import mongoose from "mongoose";
import { getEnv } from "./env.js";

export async function connectDatabase(uri?: string): Promise<typeof mongoose> {
  const env = getEnv();
  const mongoUri = uri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(mongoUri);
    return conn;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", (error as Error).message);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", (error as Error).message);
    throw error;
  }
}
