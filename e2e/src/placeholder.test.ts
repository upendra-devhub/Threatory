import { describe, expect, it } from "vitest";
import { E2E_READY } from "./index.js";

describe("e2e placeholder", () => {
  it("exports e2e ready flag", () => {
    expect(E2E_READY).toBe(false);
  });
});
