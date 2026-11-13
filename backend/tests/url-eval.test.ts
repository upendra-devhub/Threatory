import { describe, it, expect } from "vitest";
import { runEvaluation, generateEvaluationMarkdown } from "../src/scripts/eval-url.js";

describe("URL Evaluation Framework (CP-06 Task 5)", () => {
  it("executes evaluation on benign and phishing samples and verifies FPR < 5%", () => {
    const metrics = runEvaluation();

    expect(metrics.totalBenign).toBeGreaterThanOrEqual(50);
    expect(metrics.totalPhishing).toBeGreaterThanOrEqual(50);

    // Mandated exit gate threshold: FPR strictly under 5%
    expect(metrics.falsePositiveRate).toBeLessThan(5.0);

    // Accuracy and precision should be strong
    expect(metrics.precision).toBeGreaterThan(0.8);
    expect(metrics.accuracy).toBeGreaterThan(0.6);
  });

  it("generates comprehensive evaluation markdown documentation", () => {
    const metrics = runEvaluation();
    const markdown = generateEvaluationMarkdown(metrics);

    expect(markdown).toContain("URL Analyzer Detection Evaluation Report (CP-06)");
    expect(markdown).toContain("Executive Summary");
    expect(markdown).toContain("Confusion Matrix");
    expect(markdown).toContain("False Positive Rate (FPR)");
    expect(markdown).toContain("< 5.0% (MET)");
  });
});
