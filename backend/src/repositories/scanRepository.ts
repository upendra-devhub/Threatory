import { Report } from "@threatory/contracts";
import { Scan, IScan } from "../models/scan.js";

export interface CreateScanInput {
  scanId: string;
  ownerId: string;
  module: "url" | "privacy" | "website";
  status: "completed" | "partial" | "failed";
  rulesVersion: string;
  targetSummary: string;
  assessment: {
    label: string;
    riskLevel: "none_detected" | "low" | "medium" | "high";
    score?: number;
    scoreMeaning?: string;
  };
  findings: Array<{
    code: string;
    category: string;
    title: string;
    outcome: "pass" | "warn" | "fail" | "not_assessed";
    severity: "info" | "low" | "medium" | "high";
    evidence: string;
    explanation: string;
    recommendation?: string;
  }>;
  limitations: string[];
  details?: Record<string, unknown>;
  createdAt?: string | Date;
  expiresAt?: Date;
}

function calculateExpiresAt(module: string, createdAt: Date): Date {
  const days = module === "privacy" ? 7 : 30;
  return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
}

function docToReport(doc: IScan): Report {
  const createdAtStr =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : new Date(doc.createdAt).toISOString();

  return Report.parse({
    scanId: doc.scanId,
    module: doc.module,
    status: doc.status,
    rulesVersion: doc.rulesVersion,
    targetSummary: doc.targetSummary,
    assessment: {
      label: doc.assessment.label,
      riskLevel: doc.assessment.riskLevel,
      score: doc.assessment.score,
      scoreMeaning: doc.assessment.scoreMeaning,
    },
    findings: doc.findings,
    limitations: doc.limitations,
    details: doc.details,
    createdAt: createdAtStr,
  });
}

export const scanRepository = {
  async create(data: CreateScanInput): Promise<Report> {
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    const expiresAt =
      data.expiresAt || calculateExpiresAt(data.module, createdAt);

    const doc = await Scan.create({
      ...data,
      createdAt,
      expiresAt,
    });

    return docToReport(doc);
  },

  async getById(scanId: string, ownerId: string): Promise<Report | null> {
    const doc = await Scan.findOne({ scanId, ownerId }).exec();
    if (!doc) {
      return null;
    }
    return docToReport(doc);
  },

  async delete(scanId: string, ownerId: string): Promise<boolean> {
    const result = await Scan.deleteOne({ scanId, ownerId }).exec();
    return (result.deletedCount ?? 0) > 0;
  },
};
