import mongoose from 'mongoose';
import { type IPost } from '../models/post.ts';
import type { ICreatePostData } from 'types/post.ts';
import { config } from '@config/config.ts';
import { uploadImageToS3 } from "./s3Service.ts";
import { retrieveDb } from "@db/mongo.ts";
import { registerModels } from "@models/index.ts";


const db = await retrieveDb(config.dbName);         
const {Post: PostModel} = registerModels(db);

const createPost = async (postData: ICreatePostData): Promise<IPost> => {
    const protocol = config.domain.includes('localhost') ? 'http' : 'https';
    const baseURL = `${protocol}://${config.domain}`;
    const postId = new mongoose.Types.ObjectId();
    const activityPubUri = `${baseURL}/posts/${postId}`;
    const savedPost = await PostModel.create({
        _id: postId,
        author: postData.authorId,
        caption: postData.caption,
        mediaUrl: postData.mediaUrl,
        mediaType: postData.mediaType,
        activityPubUri: activityPubUri,
        likes: [],
        likesCount: 0,
        createdAt: Date.now
    });
    return savedPost;
};

const getPostById = async (id: string): Promise<any | null> => {
  return await PostModel.findById(id).populate('author', 'username displayName avatarUrl');
}

 const getUserPosts = async (userId: string, page = 1, limit = 20): Promise<IPost[]> => {
    //for pagination
    const skip = (page - 1) * limit;
    return await PostModel.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatarUrl')
      .lean();
}

 const getFeedPosts = async (userId: string, page = 1, limit = 20): Promise<IPost[]> => {
    
    const skip = (page - 1) * limit;
    
    if (userId) {
      return await PostModel.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatarUrl');
    }

    return await PostModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatarUrl');
}

 const deletePost = async (postId: string, userId: string): Promise<boolean> => {
    const post = await PostModel.findOne({ _id: postId, author: userId });
    if (!post) {
      return false;
    }
    await PostModel.deleteOne({ _id: postId, author: userId });

    //TODO: Remove media from s3 bucket using s3 service
    //TODO: Publish delete activity 
    return true;
}

const uploadImage = async (
  file: Buffer,
  mimeType: string,
  userId: string
): Promise<string> => {
  try {
    const dummyURL = 'https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png';
    const mediaUrl = await uploadImageToS3(file, mimeType, userId);
    return mediaUrl;
  } catch (error) {
    console.error("Upload image error:", error);
    throw new Error("Failed to upload image");
  }
};

export const PostService = {
  createPost,
  getPostById,
  getUserPosts,
  getFeedPosts,
  deletePost,
  uploadImage
}