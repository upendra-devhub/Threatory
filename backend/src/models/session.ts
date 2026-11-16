import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export const sessionSchema = new Schema<ISession>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// TTL index on expiresAt
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", sessionSchema);
