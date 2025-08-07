import { Document, Model, Schema, Types } from 'mongoose';
import mongoose from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId?: string; // Optional - only for local users with Google auth
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
  location?: string;
}

export interface ICommentWithAuthor extends IUser {
  commentId: Types.ObjectId;
  commentContent: string;
  commentCreatedAt: Date;
  commentAuthorId: Types.ObjectId;
}

export const userSchema = new Schema<IUser>({
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true // Allows multiple null/undefined values
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
  },
  followersUrl: {
    type: String,
  },
  followingUrl: {
    type: String,
  },
  isLocal: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    default: ''  
  },
});

export function getUserModel(conn: mongoose.Connection): Model<IUser> {
  const model = conn.model<IUser>("User", userSchema);
  
  // Create compound index for username + domain to ensure uniqueness per domain
  model.createIndexes().then(() => {
    model.collection.createIndex(
      { username: 1, domain: 1 },
      { unique: true, name: 'username_domain_unique' }
    ).catch(err => {
      console.warn('Failed to create username_domain index:', err);
    });
  });
  
  return model;
}
