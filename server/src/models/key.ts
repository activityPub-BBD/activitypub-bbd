import { Document, Model, Schema, Types } from 'mongoose';
import mongoose from "mongoose";

export interface IKey extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string; // "RSASSA-PKCS1-v1_5" or "Ed25519"
  privateKey: string; // JSON stringified JWK
  publicKey: string; // JSON stringified JWK
  createdAt: Date;
  updatedAt: Date;
}

export const keySchema = new Schema<IKey>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['RSASSA-PKCS1-v1_5', 'Ed25519']
  },
  privateKey: {
    type: String,
    required: true
  },
  publicKey: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for userId + type to ensure one key pair per type per user
keySchema.index({ userId: 1, type: 1 }, { unique: true });

export function getKeyModel(conn: mongoose.Connection): Model<IKey> {
  return conn.model<IKey>("Key", keySchema);
} 