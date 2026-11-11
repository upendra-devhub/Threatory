import { describe, it, expect } from "vitest";
import request from "supertest";
import { z } from "zod";
import { ApiError } from "@threatory/contracts";
import { app } from "../src/app.js";
import {
  formatZodError,
  validateWithZod,
  AppError,
} from "../src/middleware/errors.js";

describe("Error Handling & Validation Envelopes", () => {
  it("returns JSON 404 matching ApiError schema for unknown routes", async () => {
    const response = await request(app).get("/api/unknown-nonexistent-route");

    expect(response.status).toBe(404);

    const parsed = ApiError.safeParse(response.body);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.success).toBe(false);
      expect(parsed.data.error.code).toBe("NOT_FOUND");
      expect(parsed.data.error.message).toContain("Route not found");
    }
  });

  it("never returns stack traces on 404 responses", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.body).not.toHaveProperty("stack");
    expect(response.body.error).not.toHaveProperty("stack");
    const rawText = JSON.stringify(response.body);
    expect(rawText).not.toContain("at ");
    expect(rawText).not.toContain(".ts:");
    expect(rawText).not.toContain(".js:");
  });

  it("returns VALIDATION_ERROR on malformed JSON body without stack trace", async () => {
    const response = await request(app)
      .post("/api/scans")
      .set("Content-Type", "application/json")
      .send("{ invalid json string ");

    expect(response.status).toBe(400);

    const parsed = ApiError.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe("VALIDATION_ERROR");
      expect(parsed.data.error.message).toBe("Malformed JSON payload");
    }

    expect(response.body).not.toHaveProperty("stack");
    expect(response.body.error).not.toHaveProperty("stack");
  });

  it("formatZodError converts ZodError into VALIDATION_ERROR AppError with field details", () => {
    const testSchema = z.object({
      url: z.string().url("Must be a valid URL"),
      count: z.number().min(1, "Must be at least 1"),
    });

    const result = testSchema.safeParse({ url: "not-a-url", count: 0 });
    expect(result.success).toBe(false);

    if (!result.success) {
      const appErr = formatZodError(result.error);
      expect(appErr).toBeInstanceOf(AppError);
      expect(appErr.code).toBe("VALIDATION_ERROR");
      expect(appErr.statusCode).toBe(400);
      expect(appErr.fields).toHaveLength(2);
      expect(appErr.fields?.[0]?.path).toBe("url");
      expect(appErr.fields?.[1]?.path).toBe("count");
    }
  });

  it("validateWithZod returns valid data or throws AppError", () => {
    const testSchema = z.object({ name: z.string().min(2) });

    expect(() => validateWithZod(testSchema, { name: "a" })).toThrow(AppError);
    expect(validateWithZod(testSchema, { name: "Alice" })).toEqual({
      name: "Alice",
    });
  });
});
