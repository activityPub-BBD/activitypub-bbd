import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IFollow extends Document {
  followerId: Types.ObjectId;  // The user who follows
  followingId: Types.ObjectId; // The user being followed
  createdAt: Date;
}

export const followSchema = new Schema<IFollow>({
  followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, required: true, default: Date.now }
});
