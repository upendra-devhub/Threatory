import crypto from "node:crypto";
import mongoose from "mongoose";
import { Report } from "@threatory/contracts";
import { normaliseUrl, NormalisedUrl } from "./normalise.js";
import { runAllRules, FindingResult, RunRulesOptions } from "./rules.js";
import { rulesVersion, thresholds } from "./rules.config.js";
import { FeedEntry } from "../../models/feedEntry.js";
import { getLastFeedSyncTime } from "../feeds/syncService.js";

export interface AnalyseUrlOptions extends RunRulesOptions {
  scanId?: string;
  createdAt?: string;
  feedChecked?: boolean;
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
 * Queries local MongoDB FeedEntry collection for an exact URL or host match.
 */
export async function queryFeedMatch(
  urlTarget: string,
  hostTarget: string
): Promise<{ match: boolean; source?: string; target?: string } | null> {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const matchDoc = await FeedEntry.findOne({
      target: { $in: [urlTarget.toLowerCase(), hostTarget.toLowerCase()] },
      active: true,
    }).exec();

    if (matchDoc) {
      return {
        match: true,
        source: matchDoc.source,
        target: matchDoc.target,
      };
    }
  } catch {
    // Database query failure should never abort scanning
  }

  return null;
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

  let feedLimitation: string;
  if (options?.feedChecked || options?.feedLastUpdated !== undefined) {
    feedLimitation = options?.feedLastUpdated
      ? `Reputation checked against locally stored threat intelligence feeds (last updated: ${options.feedLastUpdated})`
      : "Reputation checked against locally stored threat intelligence feeds (no sync recorded)";
  } else {
    feedLimitation = "Reputation feeds not consulted";
  }

  const limitations = [
    "Link not visited",
    "Page content not analysed",
    feedLimitation,
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

/**
 * Async URL analysis that queries local MongoDB FeedEntry collection and sync metadata.
 */
export async function analyseUrlAsync(
  rawUrl: string,
  options?: AnalyseUrlOptions
): Promise<UrlServiceResult> {
  const normalised = normaliseUrl(rawUrl);

  let feedMatch = options?.feedMatch;
  let feedLastUpdated = options?.feedLastUpdated;

  if (feedMatch === undefined && mongoose.connection.readyState === 1) {
    const match = await queryFeedMatch(normalised.original, normalised.host);
    if (match) {
      feedMatch = match;
    }
  }

  if (feedLastUpdated === undefined && mongoose.connection.readyState === 1) {
    feedLastUpdated = await getLastFeedSyncTime();
  }

  return analyseUrl(rawUrl, {
    ...options,
    feedChecked: true,
    feedMatch,
    feedLastUpdated,
  });
}
