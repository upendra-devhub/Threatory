import mongoose, { Document, Schema, Model } from "mongoose";

export interface IFeedEntry {
  target: string;
  targetType: "url" | "host";
  source: "openphish" | "urlhaus" | "custom";
  firstSeen: Date;
  lastSeen: Date;
  active: boolean;
}

export interface FeedEntryDocument extends IFeedEntry, Document {}

const feedEntrySchema = new Schema<FeedEntryDocument>(
  {
    target: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["url", "host"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["openphish", "urlhaus", "custom"],
      required: true,
      index: true,
    },
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast upsert and idempotency
feedEntrySchema.index({ target: 1, source: 1 }, { unique: true });

export const FeedEntry: Model<FeedEntryDocument> =
  (mongoose.models.FeedEntry as Model<FeedEntryDocument>) ||
  mongoose.model<FeedEntryDocument>("FeedEntry", feedEntrySchema);
