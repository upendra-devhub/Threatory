import { DashboardSummary, HistoryPage, Module, Report } from "@threatory/contracts";
import { Scan, IScan } from "../models/scan.js";

export interface ListScansOptions {
  ownerId: string;
  module?: Module;
  status?: "completed" | "partial" | "failed";
  from?: string | Date;
  to?: string | Date;
  page?: number;
  limit?: number;
}

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

  async list(options: ListScansOptions): Promise<HistoryPage> {
    const filter: Record<string, unknown> = { ownerId: options.ownerId };

    if (options.module) {
      filter.module = options.module;
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.from || options.to) {
      const dateFilter: Record<string, Date> = {};
      if (options.from) {
        dateFilter.$gte =
          options.from instanceof Date ? options.from : new Date(options.from);
      }
      if (options.to) {
        dateFilter.$lte =
          options.to instanceof Date
            ? options.to
            : typeof options.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(options.to)
              ? new Date(`${options.to}T23:59:59.999Z`)
              : new Date(options.to);
      }
      filter.createdAt = dateFilter;
    }

    const page = options.page && options.page > 0 ? options.page : 1;
    const limit =
      options.limit && options.limit > 0 ? Math.min(options.limit, 50) : 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Scan.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Scan.countDocuments(filter).exec(),
    ]);

    const items = docs.map((doc) => ({
      scanId: doc.scanId,
      module: doc.module,
      status: doc.status,
      targetSummary: doc.targetSummary,
      assessment: {
        label: doc.assessment.label,
        riskLevel: doc.assessment.riskLevel,
      },
      createdAt:
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : new Date(doc.createdAt).toISOString(),
    }));

    return HistoryPage.parse({
      items,
      page,
      limit,
      total,
    });
  },

  async getDashboardSummary(ownerId: string): Promise<DashboardSummary> {
    interface FacetResult {
      total: Array<{ count: number }>;
      byModule: Array<{ _id: string; count: number }>;
      byRiskLevel: Array<{ _id: string; count: number }>;
      recent: Array<{
        scanId: string;
        module: "url" | "privacy" | "website";
        status: "completed" | "partial" | "failed";
        targetSummary: string;
        assessment: {
          label: string;
          riskLevel: "none_detected" | "low" | "medium" | "high";
        };
        createdAt: Date | string;
      }>;
    }

    const [facet] = (await Scan.aggregate<FacetResult>([
      { $match: { ownerId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          byModule: [{ $group: { _id: "$module", count: { $sum: 1 } } }],
          byRiskLevel: [
            { $group: { _id: "$assessment.riskLevel", count: { $sum: 1 } } },
          ],
          recent: [
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                scanId: 1,
                module: 1,
                status: 1,
                targetSummary: 1,
                assessment: {
                  label: "$assessment.label",
                  riskLevel: "$assessment.riskLevel",
                },
                createdAt: 1,
              },
            },
          ],
        },
      },
    ]).exec()) as [FacetResult | undefined];

    const totalScans = facet?.total[0]?.count ?? 0;

    const byModule = {
      url: 0,
      privacy: 0,
      website: 0,
    };
    if (facet?.byModule) {
      for (const m of facet.byModule) {
        if (m._id in byModule) {
          byModule[m._id as keyof typeof byModule] = m.count;
        }
      }
    }

    const byRiskLevel = {
      none_detected: 0,
      low: 0,
      medium: 0,
      high: 0,
    };
    if (facet?.byRiskLevel) {
      for (const r of facet.byRiskLevel) {
        if (r._id in byRiskLevel) {
          byRiskLevel[r._id as keyof typeof byRiskLevel] = r.count;
        }
      }
    }

    const recent = (facet?.recent || []).map((doc) => ({
      scanId: doc.scanId,
      module: doc.module,
      status: doc.status,
      targetSummary: doc.targetSummary,
      assessment: {
        label: doc.assessment.label,
        riskLevel: doc.assessment.riskLevel,
      },
      createdAt:
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : new Date(doc.createdAt).toISOString(),
    }));

    return DashboardSummary.parse({
      totalScans,
      byModule,
      byRiskLevel,
      recent,
    });
  },
};
