import { Document, Model, Schema, Types } from 'mongoose';
import mongoose from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId: string;
  domain: string; //example.com
  actorId: string;
  handle: string; //@alice@example.com -> webfinger resource
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
  handle: {
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
  },
  location: {
    type: String,
    default: ''  
  }
});

