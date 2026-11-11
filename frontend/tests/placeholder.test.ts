import { describe, expect, it } from "vitest";
import { FRONTEND_VERSION } from "../src/index.js";

describe("frontend placeholder", () => {
  it("exports frontend version", () => {
    expect(FRONTEND_VERSION).toBe("0.1.0");
  });
});
