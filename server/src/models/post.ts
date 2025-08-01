import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPost extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  caption: string;
  mediaUrl: string;
  mediaType: string;
  activityPubUri: string;
  likes: Types.ObjectId[];
  likesCount: number;
  createdAt: Date;
}

const postSchema = new Schema<IPost>({
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
    required: true
  },
  mediaType: {
    type: String,
    required: true,
    enum: ['image/jpeg', 'image/png', 'image/webp']
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
  }
});

export const Post = mongoose.model<IPost>('Post', postSchema);
