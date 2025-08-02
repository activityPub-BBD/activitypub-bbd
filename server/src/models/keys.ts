import mongoose, { Document, Types } from 'mongoose';

export interface IKeyPair extends Document {
  userId: Types.ObjectId;
  type: "RSASSA-PKCS1-v1_5" | "Ed25519";
  privateKey: string;
  publicKey: string;
  createdAt: Date;
}

export const keySchema = new mongoose.Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["RSASSA-PKCS1-v1_5", "Ed25519"],
    required: true,
  },
  privateKey: {
    type: String,
    required: true,
    validate: (v: string) => v.trim() !== "",
  },
  publicKey: {
    type: String,
    required: true,
    validate: (v: string) => v.trim() !== "",
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

keySchema.index({ userId: 1, type: 1 }, { unique: true });
