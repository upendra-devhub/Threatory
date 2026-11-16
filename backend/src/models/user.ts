import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

export const userSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
