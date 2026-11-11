import { describe, it, expect } from "vitest";
import { validateEnv } from "../src/config/env.js";

describe("Environment Validation", () => {
  const validBaseEnv = {
    MONGODB_URI: "mongodb://localhost:27017/threatory",
    FRONTEND_ORIGIN: "http://localhost:3000",
    COOKIE_SECRET: "test_cookie_secret_at_least_32_characters_long",
    NODE_ENV: "development",
  };

  it("validates successfully with required variables", () => {
    const env = validateEnv(validBaseEnv);
    expect(env.MONGODB_URI).toBe(validBaseEnv.MONGODB_URI);
    expect(env.PORT).toBe(4000);
    expect(env.FRONTEND_ORIGIN).toBe(validBaseEnv.FRONTEND_ORIGIN);
    expect(env.COOKIE_SECRET).toBe(validBaseEnv.COOKIE_SECRET);
    expect(env.NODE_ENV).toBe("development");
  });

  it("fails startup on missing MONGODB_URI", () => {
    const { MONGODB_URI: _, ...missingMongo } = validBaseEnv;
    expect(() => validateEnv(missingMongo)).toThrow(/MONGODB_URI/);
  });

  it("fails startup on missing FRONTEND_ORIGIN", () => {
    const { FRONTEND_ORIGIN: _, ...missingOrigin } = validBaseEnv;
    expect(() => validateEnv(missingOrigin)).toThrow(/FRONTEND_ORIGIN/);
  });

  it("fails startup on missing COOKIE_SECRET", () => {
    const { COOKIE_SECRET: _, ...missingSecret } = validBaseEnv;
    expect(() => validateEnv(missingSecret)).toThrow(/COOKIE_SECRET/);
  });

  it("refuses to start if DEV_OWNER_ID is set in production", () => {
    const prodWithDevOwner = {
      ...validBaseEnv,
      NODE_ENV: "production",
      DEV_OWNER_ID: "dev-owner-not-allowed-in-prod",
    };
    expect(() => validateEnv(prodWithDevOwner)).toThrow(
      /DEV_OWNER_ID must not be set in production/
    );
  });

  it("allows DEV_OWNER_ID in development", () => {
    const devWithDevOwner = {
      ...validBaseEnv,
      NODE_ENV: "development",
      DEV_OWNER_ID: "dev-owner-allowed",
    };
    const env = validateEnv(devWithDevOwner);
    expect(env.DEV_OWNER_ID).toBe("dev-owner-allowed");
  });
});
