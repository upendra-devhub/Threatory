import crypto from "node:crypto";
import { Report } from "@threatory/contracts";
import { normaliseUrl, NormalisedUrl } from "./normalise.js";
import { runAllRules, FindingResult, RunRulesOptions } from "./rules.js";
import { rulesVersion, thresholds } from "./rules.config.js";

export interface AnalyseUrlOptions extends RunRulesOptions {
  scanId?: string;
  createdAt?: string;
  feedLastUpdated?: string | null;
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
  const feedMatched = findingResults.some(
    (f) => f.code === "URL_FEED_MATCH" && f.triggered
  );

  const sumWeights = findingResults.reduce(
    (acc, f) => (f.triggered ? acc + f.weight : acc),
    0
  );
  const score = feedMatched
    ? thresholds.maxScore
    : Math.min(thresholds.maxScore, sumWeights);

  if (feedMatched || score > thresholds.scoreBrackets.mediumMax) {
    return {
      score,
      riskLevel: "high",
      label: "High",
      scoreMeaning: "High risk indicators detected",
    };
  }

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

  return {
    score,
    riskLevel: "medium",
    label: "Medium",
    scoreMeaning: "Medium risk indicators detected",
  };
}

/**
 * Analyzes a URL string, runs deterministic detection rules, and returns a validated Report.
 */
export function analyseUrl(
  rawUrl: string,
  options?: AnalyseUrlOptions
): UrlServiceResult {
  const normalised = normaliseUrl(rawUrl);
  const findingResults = runAllRules(normalised, options);
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

  const limitations = [
    "Link not visited",
    "Page content not analysed",
    options?.feedLastUpdated
      ? `Reputation checked against locally stored threat intelligence feeds (last updated: ${options.feedLastUpdated})`
      : "Reputation feeds not consulted",
  ];

  const reportData = {
    scanId,
    module: "url" as const,
    status: "completed" as const,
    rulesVersion,
    targetSummary: normalised.original,
    assessment,
    findings,
    limitations,
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
