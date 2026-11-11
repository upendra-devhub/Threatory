import { z } from "zod";

export const Outcome = z.enum(["pass", "warn", "fail", "not_assessed"]);
export type Outcome = z.infer<typeof Outcome>;

export const Severity = z.enum(["info", "low", "medium", "high"]);
export type Severity = z.infer<typeof Severity>;

export const RiskLevel = z.enum(["none_detected", "low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const Module = z.enum(["url", "privacy", "website"]);
export type Module = z.infer<typeof Module>;

export const Finding = z
  .object({
    code: z.string(),
    category: z.string(),
    title: z.string(),
    outcome: Outcome,
    severity: Severity,
    evidence: z.string(),
    explanation: z.string(),
    recommendation: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      (val.outcome === "warn" || val.outcome === "fail") &&
      (!val.recommendation || val.recommendation.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recommendation"],
        message: "Recommendation is required when outcome is warn or fail",
      });
    }
  });
export type Finding = z.infer<typeof Finding>;

export const Report = z.object({
  scanId: z.string(),
  module: Module,
  status: z.enum(["completed", "partial", "failed"]),
  rulesVersion: z.string(),
  targetSummary: z.string(),
  assessment: z.object({
    label: z.string(),
    riskLevel: RiskLevel,
    score: z.number().min(0).max(100).optional(),
    scoreMeaning: z.string().optional(),
  }),
  findings: z.array(Finding),
  limitations: z.array(z.string()),
  details: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type Report = z.infer<typeof Report>;

export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), data });

export const ApiError = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "TARGET_BLOCKED",
      "RATE_LIMITED",
      "INTERNAL",
      "UPSTREAM_FAILURE",
    ]),
    message: z.string(),
    fields: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

export const UrlScanRequest = z.object({
  url: z.string().trim().min(1).max(2048),
});
export type UrlScanRequest = z.infer<typeof UrlScanRequest>;

export const PrivacyScanRequest = z.object({
  profiles: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(30),
        username: z
          .string()
          .trim()
          .min(1)
          .max(64)
          .regex(/^[A-Za-z0-9._-]+$/),
        url: z.string().trim().max(2048).optional(),
      })
    )
    .min(1)
    .max(10),
  displayName: z.string().trim().max(80).optional(),
  submittedText: z.string().max(10000).optional(),
  consent: z.literal(true),
});
export type PrivacyScanRequest = z.infer<typeof PrivacyScanRequest>;

export const WebsiteScanRequest = z.object({
  url: z.string().trim().min(1).max(2048),
  authorised: z.literal(true),
});
export type WebsiteScanRequest = z.infer<typeof WebsiteScanRequest>;

export const HistoryItem = z.object({
  scanId: z.string(),
  module: Module,
  status: z.enum(["completed", "partial", "failed"]),
  targetSummary: z.string(),
  assessment: z.object({
    label: z.string(),
    riskLevel: RiskLevel,
  }),
  createdAt: z.string().datetime(),
});
export type HistoryItem = z.infer<typeof HistoryItem>;

export const HistoryPage = z.object({
  items: z.array(HistoryItem),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});
export type HistoryPage = z.infer<typeof HistoryPage>;

export const DashboardSummary = z.object({
  totalScans: z.number(),
  byModule: z.object({
    url: z.number(),
    privacy: z.number(),
    website: z.number(),
  }),
  byRiskLevel: z.object({
    none_detected: z.number(),
    low: z.number(),
    medium: z.number(),
    high: z.number(),
  }),
  recent: z.array(HistoryItem),
});
export type DashboardSummary = z.infer<typeof DashboardSummary>;
