import { describe, expect, it } from "vitest";
import { E2E_READY } from "./index.js";

describe("e2e suite readiness", () => {
  it("exports e2e ready flag", () => {
    expect(E2E_READY).toBe(true);
  });
});
