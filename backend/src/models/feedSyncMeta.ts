import mongoose, { Document, Schema, Model } from "mongoose";

export interface IFeedSyncMeta {
  feed: string;
  lastAttemptAt: Date;
  lastSuccessAt?: Date;
  status: "success" | "failed";
  recordsCount: number;
  error?: string;
}

export interface FeedSyncMetaDocument extends IFeedSyncMeta, Document {}

const feedSyncMetaSchema = new Schema<FeedSyncMetaDocument>(
  {
    feed: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastAttemptAt: {
      type: Date,
      required: true,
    },
    lastSuccessAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    recordsCount: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const FeedSyncMeta: Model<FeedSyncMetaDocument> =
  (mongoose.models.FeedSyncMeta as Model<FeedSyncMetaDocument>) ||
  mongoose.model<FeedSyncMetaDocument>("FeedSyncMeta", feedSyncMetaSchema);
