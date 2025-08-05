import type { Types } from "mongoose";

export interface ICreatePostData {
  authorId: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: string;
  activityPubUri?: string;
}

export interface IPostUser {
  _id: Types.ObjectId;
  displayName: string;
  avatarUrl?: string;
  username: string;
}

export interface IPostResponse {
  id: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  caption: string;
  mediaUrl: string;
  mediaType: string;
  activityPubUri: string;
  likesCount: number;
  likes: Types.ObjectId[];
  createdAt: Date;
}