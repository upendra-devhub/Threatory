import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    FRONTEND_ORIGIN: z.string().min(1, "FRONTEND_ORIGIN is required"),
    COOKIE_SECRET: z.string().min(1, "COOKIE_SECRET is required"),
    DEV_OWNER_ID: z.string().optional(),
    TRUST_PROXY: z.string().optional(),
    FEEDS_SYNC_ENABLED: z.preprocess((val) => {
      if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
      return Boolean(val);
    }, z.boolean()).default(false),
    OPENPHISH_FEED_URL: z.string().url().default("https://openphish.com/feed.txt"),
    URLHAUS_FEED_URL: z.string().url().optional(),
    URLHAUS_AUTH_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.NODE_ENV === "production" &&
      data.DEV_OWNER_ID &&
      data.DEV_OWNER_ID.trim().length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DEV_OWNER_ID"],
        message: "DEV_OWNER_ID must not be set in production",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.errors
      .map((err) => `${err.path.join(".") || "env"}: ${err.message}`)
      .join("\n  ");
    throw new Error(`Environment validation failed:\n  ${details}`);
  }
  return result.data;
}

export function getEnv(): Env {
  if (process.env.NODE_ENV === "test") {
    return validateEnv({
      MONGODB_URI: "mongodb://localhost:27017/threatory_test",
      FRONTEND_ORIGIN: "http://localhost:3000",
      COOKIE_SECRET: "test_cookie_secret_at_least_32_characters_long",
      ...process.env,
    });
  }
  return validateEnv(process.env);
}
