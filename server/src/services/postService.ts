import mongoose, { Types } from 'mongoose';
import { Post, type IPost } from '../models/post.ts';
import type { ICreatePostData } from 'types/post.ts';
import { config } from '@config/config.ts';

export const createPost = async (postData: ICreatePostData): Promise<IPost> => {
    // mock createPost
    const postId = new mongoose.Types.ObjectId();
    const activityPubURI = `${config.baseURL}/posts/${postId}`;
    const post = new Post({
      _id: postId,
      author: postData.authorId,
      caption: postData.caption,
      mediaUrl: postData.mediaUrl,
      mediaType: postData.mediaType,
      activityPubURI,
      likes: [],
      likesCount: 0,
    });
    const savedPost = await post.save();
    return savedPost;
};

export const getPostById = async (id: string): Promise<IPost | null> => {
    //replace the objectID in author with the actual User's values
    return await Post.findById(id).populate('author', 'displayName avatarUrl');
}

export const getUserPosts = async (userId: string, page = 1, limit = 20): Promise<IPost[]> => {
    //for pagination
    const skip = (page - 1) * limit;
    return await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'displayName avatarUrl');
}

export const getFeedPosts = async (userId: string, page = 1, limit = 20): Promise<IPost[]> => {
    //TODO:  user specific feed
    const skip = (page - 1) * limit;
    return await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatarUrl');
}

export const deletePost = async (postId: string, userId: string): Promise<boolean> => {
    const post = await Post.findOne({ _id: postId, author: userId });
    if (!post) {
      return false;
    }

    //TODO: Remove media from s3 bucket using s3 service
    //TODO: Publish delete activity 
    return true;
}

export const uploadImage = async(file: Buffer, mimeType: string, userId: string): Promise<string> => {
    //TODO: Validate image type and image size -> do in s3 service
    //TODO: Upload using s3 service
    return ''
}
