import crypto from "node:crypto";
import { Report, RiskLevel } from "@threatory/contracts";
import { normalisePrivacyInput, NormalisedPrivacyInput } from "./normalise.js";
import { runPrivacyRules, PrivacyFindingResult } from "./rules.js";
import { rulesVersion } from "./rules.config.js";

export interface AnalysePrivacyOptions {
  scanId?: string;
  createdAt?: string;
}

export interface PrivacyServiceResult {
  report: Report;
  normalised: NormalisedPrivacyInput;
}

/**
 * Calculates risk level and label for privacy reports.
 * The Privacy Analyzer does not calculate a numeric score.
 */
function calculatePrivacyAssessment(findingResults: PrivacyFindingResult[]): {
  riskLevel: RiskLevel;
  label: string;
} {
  const triggeredFindings = findingResults.filter((f) => f.triggered);

  if (triggeredFindings.length === 0) {
    return {
      riskLevel: "none_detected",
      label: "No exposure patterns detected",
    };
  }

  let riskLevel: RiskLevel = "none_detected";
  if (triggeredFindings.some((f) => f.severity === "high")) {
    riskLevel = "high";
  } else if (triggeredFindings.some((f) => f.severity === "medium")) {
    riskLevel = "medium";
  } else if (triggeredFindings.some((f) => f.severity === "low")) {
    riskLevel = "low";
  }

  const count = triggeredFindings.length;
  const label = `${count} exposure signal${count === 1 ? "" : "s"} found`;

  return {
    riskLevel,
    label,
  };
}

/**
 * Builds a safe target summary describing supplied data volume without leaking raw content.
 * Example: "2 profiles, text provided (1,204 characters)" or "1 profile, no text provided".
 */
export function buildTargetSummary(input: NormalisedPrivacyInput): string {
  const count = input.profiles.length;
  const profileLabel = count === 1 ? "1 profile" : `${count} profiles`;

  const textLength = input.submittedText ? input.submittedText.length : 0;
  const textLabel =
    textLength > 0
      ? `text provided (${textLength.toLocaleString("en-US")} characters)`
      : "no text provided";

  return `${profileLabel}, ${textLabel}`;
}

export const PRIVACY_LIMITATIONS = [
  "Only information explicitly supplied by the user was analysed.",
  "No internet-wide account or username search was performed.",
  "No profile page was fetched or visited.",
  "No account ownership or real-world identity was verified.",
  "No data breach database lookup was performed.",
];

/**
 * Analyzes privacy input, executes detection rules, masks all sensitive evidence,
 * and generates a validated Report without persisting or exposing raw privacy values.
 */
export function analysePrivacy(
  rawInput: unknown,
  options?: AnalysePrivacyOptions
): PrivacyServiceResult {
  const normalised = normalisePrivacyInput(rawInput);
  const findingResults = runPrivacyRules(normalised);
  const assessment = calculatePrivacyAssessment(findingResults);

  const scanId = options?.scanId || `scan-priv-${crypto.randomUUID()}`;
  const createdAt = options?.createdAt || new Date().toISOString();

  const findings = findingResults.map(({ triggered: _t, ...f }) => ({
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
    module: "privacy" as const,
    status: "completed" as const,
    rulesVersion,
    targetSummary: buildTargetSummary(normalised),
    assessment,
    findings,
    limitations: PRIVACY_LIMITATIONS,
    details: {
      profilesCount: normalised.profiles.length,
      textLength: normalised.submittedText ? normalised.submittedText.length : 0,
      hasDisplayName: Boolean(normalised.displayName),
      evaluatedRulesCount: findingResults.length,
    },
    createdAt,
  };

  const report = Report.parse(reportData);

  return {
    report,
    normalised,
  };
}
