import mongoose, { Schema, Document, Model } from "mongoose";
import type { Module, Outcome, Severity, RiskLevel } from "@threatory/contracts";

export interface IFinding {
  code: string;
  category: string;
  title: string;
  outcome: Outcome;
  severity: Severity;
  evidence: string;
  explanation: string;
  recommendation?: string;
}

export interface IAssessment {
  label: string;
  riskLevel: RiskLevel;
  score?: number;
  scoreMeaning?: string;
}

export interface IScan extends Document {
  scanId: string;
  ownerId: string;
  module: Module;
  status: "completed" | "partial" | "failed";
  rulesVersion: string;
  targetSummary: string;
  assessment: IAssessment;
  findings: IFinding[];
  limitations: string[];
  details?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

const findingSchema = new Schema<IFinding>(
  {
    code: { type: String, required: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    outcome: {
      type: String,
      enum: ["pass", "warn", "fail", "not_assessed"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "low", "medium", "high"],
      required: true,
    },
    evidence: { type: String, required: true },
    explanation: { type: String, required: true },
    recommendation: { type: String },
  },
  { _id: false }
);

const assessmentSchema = new Schema<IAssessment>(
  {
    label: { type: String, required: true },
    riskLevel: {
      type: String,
      enum: ["none_detected", "low", "medium", "high"],
      required: true,
    },
    score: { type: Number },
    scoreMeaning: { type: String },
  },
  { _id: false }
);

export const scanSchema = new Schema<IScan>(
  {
    scanId: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    module: {
      type: String,
      enum: ["url", "privacy", "website"],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "partial", "failed"],
      required: true,
    },
    rulesVersion: { type: String, required: true },
    targetSummary: { type: String, required: true },
    assessment: { type: assessmentSchema, required: true },
    findings: { type: [findingSchema], default: [] },
    limitations: { type: [String], default: [] },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Indexes: ownerId + createdAt, ownerId + module + createdAt, and TTL on expiresAt
scanSchema.index({ ownerId: 1, createdAt: -1 });
scanSchema.index({ ownerId: 1, module: 1, createdAt: -1 });
scanSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Scan: Model<IScan> =
  mongoose.models.Scan || mongoose.model<IScan>("Scan", scanSchema);
