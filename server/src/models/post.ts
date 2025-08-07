import { Document, Model, Schema, Types } from 'mongoose';
import mongoose from "mongoose";

export interface IPost<TAuthor = Types.ObjectId> extends Document {
  _id: Types.ObjectId;
  author: TAuthor;
  caption: string;
  mediaUrl?: string;
  mediaType?: string;
  activityPubUri: string;
  likes: Types.ObjectId[];
  likesCount: number;
  createdAt: Date;
  comments: {
    _id: Types.ObjectId;
    author: TAuthor;
    content: string;
    createdAt: Date;
  }[];
}

export const postSchema = new Schema<IPost>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  caption: {
    type: String,
    required: true,
    maxlength: 2200
  },
  mediaUrl: {
    type: String,
    required: false,
  },
  mediaType: {
    type: String,
    required: false,
    enum: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", ""],
  },
  activityPubUri: {
    type: String,
    required: true,
    unique: true,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    required: true
  },
  comments: [{
    _id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      required: true
    }
  }]
});

export function getPostModel(conn: mongoose.Connection): Model<IPost> {
  return conn.model<IPost>("Post", postSchema);
}