import crypto from "node:crypto";
import { Report } from "@threatory/contracts";
import { normaliseUrl, NormalisedUrl } from "./normalise.js";
import { runCoreRules, FindingResult } from "./rules.js";
import { rulesVersion, thresholds } from "./rules.config.js";

export interface AnalyseUrlOptions {
  scanId?: string;
  createdAt?: string;
}

export interface UrlServiceResult {
  report: Report;
  normalised: NormalisedUrl;
}

/**
 * Calculates score, risk level, label, and score meaning per Appendix B1.
 */
function calculateAssessment(findingResults: FindingResult[]): {
  score: number;
  riskLevel: "none_detected" | "low" | "medium" | "high";
  label: string;
  scoreMeaning: string;
} {
  const sumWeights = findingResults.reduce(
    (acc, f) => (f.triggered ? acc + f.weight : acc),
    0
  );
  const score = Math.min(thresholds.maxScore, sumWeights);

  if (score <= thresholds.scoreBrackets.noneDetectedMax) {
    return {
      score,
      riskLevel: "none_detected",
      label: "No suspicious signals detected",
      scoreMeaning: "No suspicious signals detected",
    };
  }

  if (score <= thresholds.scoreBrackets.lowMax) {
    return {
      score,
      riskLevel: "low",
      label: "Low",
      scoreMeaning: "Low risk indicators detected",
    };
  }

  if (score <= thresholds.scoreBrackets.mediumMax) {
    return {
      score,
      riskLevel: "medium",
      label: "Medium",
      scoreMeaning: "Medium risk indicators detected",
    };
  }

  return {
    score,
    riskLevel: "high",
    label: "High",
    scoreMeaning: "High risk indicators detected",
  };
}

/**
 * Analyzes a URL string, runs core detection rules, and returns a validated Report.
 */
export function analyseUrl(
  rawUrl: string,
  options?: AnalyseUrlOptions
): UrlServiceResult {
  const normalised = normaliseUrl(rawUrl);
  const findingResults = runCoreRules(normalised);
  const assessment = calculateAssessment(findingResults);

  const scanId = options?.scanId || `scan-url-${crypto.randomUUID()}`;
  const createdAt = options?.createdAt || new Date().toISOString();

  const searchParams = new URLSearchParams(normalised.query);
  const queryParamNames = Array.from(new Set(searchParams.keys()));

  const findings = findingResults.map(({ weight: _w, triggered: _t, ...f }) => ({
    code: f.code,
    category: f.category,
    title: f.title,
    outcome: f.outcome,
    severity: f.severity,
    evidence: f.evidence,
    explanation: f.explanation,
    ...(f.recommendation ? { recommendation: f.recommendation } : {}),
  }));

  const reportData = {
    scanId,
    module: "url" as const,
    status: "completed" as const,
    rulesVersion,
    targetSummary: normalised.original,
    assessment,
    findings,
    limitations: [
      "Link not visited",
      "Page content not analysed",
      "Reputation feeds not consulted",
    ],
    details: {
      scheme: normalised.scheme,
      host: normalised.host,
      registrableDomain: normalised.registrableDomain,
      subdomainLabels: normalised.subdomainLabels,
      port: normalised.port,
      queryParamNames,
    },
    createdAt,
  };

  const report = Report.parse(reportData);

  return {
    report,
    normalised,
  };
}
