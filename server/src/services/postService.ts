import mongoose, { Types } from 'mongoose';
import { Post, type IPost, getPostModel } from "../models/post.ts";
import type { ICreatePostData } from 'types/post.ts';
import { config } from '@config/config.ts';
import { uploadImageToS3 } from "./s3Service.ts";
import { retrieveDb } from "@db/db.ts";
import { getUserModel } from "@models/user.ts";

export const createPost = async (postData: ICreatePostData): Promise<IPost> => {
  // Get the database connection and models
  const db = await retrieveDb(config.dbName);
  const PostModel = getPostModel(db);
  const UserModel = getUserModel(db);

  // mock createPost
  const protocol = config.domain.includes("localhost") ? "http" : "https";
  const baseURL = `${protocol}://${config.domain}`;
  const postId = new mongoose.Types.ObjectId();
  const activityPubUri = `${baseURL}/posts/${postId}`;
  const post = new PostModel({
    _id: postId,
    author: postData.authorId,
    caption: postData.caption,
    mediaUrl: postData.mediaUrl,
    mediaType: postData.mediaType,
    activityPubUri,
    likes: [],
    likesCount: 0,
    createdAt: new Date(),
  });
  const savedPost = await post.save();
  return savedPost;
};

export const getPostById = async (id: string): Promise<IPost | null> => {
  // Get the database connection and models
  const db = await retrieveDb(config.dbName);
  const PostModel = getPostModel(db);
  const UserModel = getUserModel(db);

  //replace the objectID in author with the actual User's values
  return await PostModel.findById(id).populate({
    path: "author",
    model: UserModel,
    select: "displayName avatarUrl",
  });
};

export const getUserPosts = async (
  userId: string,
  page = 1,
  limit = 20
): Promise<IPost[]> => {
  // Get the database connection and models
  const db = await retrieveDb(config.dbName);
  const PostModel = getPostModel(db);
  const UserModel = getUserModel(db);

  //for pagination
  const skip = (page - 1) * limit;
  return await PostModel.find({ author: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "author",
      model: UserModel,
      select: "displayName avatarUrl",
    });
};

export const getFeedPosts = async (
  userId: string,
  page = 1,
  limit = 20
): Promise<IPost[]> => {
  // Get the database connection and models
  const db = await retrieveDb(config.dbName);
  const PostModel = getPostModel(db);
  const UserModel = getUserModel(db);

  //TODO:  user specific feed
  const skip = (page - 1) * limit;
  return await PostModel.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "author",
      model: UserModel,
      select: "username displayName avatarUrl",
    });
};

export const deletePost = async (postId: string, userId: string): Promise<boolean> => {
    const post = await Post.findOne({ _id: postId, author: userId });
    if (!post) {
      return false;
    }

    //TODO: Remove media from s3 bucket using s3 service
    //TODO: Publish delete activity 
    return true;
}

export const uploadImage = async (
  file: Buffer,
  mimeType: string,
  userId: string
): Promise<string> => {
  try {
    const mediaUrl = await uploadImageToS3(file, mimeType, userId);
    return mediaUrl;
  } catch (error) {
    console.error("Upload image error:", error);
    throw new Error("Failed to upload image");
  }
};
