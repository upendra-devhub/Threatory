import { describe, expect, it } from "vitest";
import { BACKEND_VERSION } from "../src/index.js";

describe("backend placeholder", () => {
  it("exports backend version", () => {
    expect(BACKEND_VERSION).toBe("0.1.0");
  });
});
