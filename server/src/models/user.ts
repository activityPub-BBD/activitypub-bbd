import { Document, Model, Schema, Types } from 'mongoose';
import mongoose from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId: string;
  domain: string; //example.com
  actorId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  inboxUrl: string;
  outboxUrl: string;
  followersUrl: string;
  followingUrl: string;
  isLocal: boolean;
  createdAt: Date;
}

export const userSchema = new Schema<IUser>({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  actorId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: ''
  },
  avatarUrl: {
    type: String
  },
  inboxUrl: {
    type: String,
    required: true
  },
  outboxUrl: {
    type: String,
    required: true
  },
  followersUrl: {
    type: String,
    required: true
  },
  followingUrl: {
    type: String,
    required: true
  },
  isLocal: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    required: true
  }
});

export function getUserModel(conn: mongoose.Connection): Model<IUser> {
  return conn.model<IUser>("User", userSchema);
}
