import mongoose from 'mongoose';
import { type IPost } from '../models/post';
import type { ICreatePostData } from 'types/post';
import { config } from '@config/config';
import { uploadImageToS3 } from "./s3Service";
import { retrieveDb } from "@db/mongo";
import { registerModels, type ICommentWithAuthor, type IUser } from "@models/index";
import { UserService } from './userService';
import { ActivityService } from './activityService';


const db = await retrieveDb(config.dbName);         
const {Post: PostModel, User: UserModel} = registerModels(db);

const createPost = async (postData: ICreatePostData, federationContext?: any): Promise<IPost> => {
    const protocol = config.domain.includes('localhost') ? 'http' : 'https';
    const baseURL = `${protocol}://${config.domain}`;
    const postId = new mongoose.Types.ObjectId();
    
    const activityPubUri = postData.activityPubUri || `${baseURL}/posts/${postId}`;
    
    const savedPost = await PostModel.create({
        _id: postId,
        author: postData.authorId,
        caption: postData.caption,
        mediaUrl: postData.mediaUrl,
        mediaType: postData.mediaType,
        activityPubUri: activityPubUri,
        likes: [],
        likesCount: 0,
        createdAt: new Date().toISOString(),
        comments: []
    });

    const author = await UserService.getUserByObjectId(postData.authorId);
    if (author && federationContext) {
        // queue activity
        await ActivityService.queueCreateNoteActivity(savedPost, author, federationContext);
    }

    return savedPost;
};

const getPostById = async (id: string): Promise<any | null> => {
  return await PostModel.findById(id).populate('author', 'username displayName avatarUrl');
}

 const getUserPosts = async (
   userId: string,
   page = 1,
   limit = 20
 ): Promise<{
   items: IPost[];
   nextCursor: string | null;
   last: number;
   totalCount: number;
 }> => {
   //for pagination
   const skip = (page - 1) * limit;

   const totalCount = await PostModel.countDocuments({ author: userId });

   // Get posts for current page
   const posts = await PostModel.find({ author: userId })
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(limit + 1) // Get one extra to check if there are more pages
     .populate("author", "username displayName avatarUrl")
     .lean();

   // Check if there are more pages
   const hasMore = posts.length > limit;
   const items = hasMore ? posts.slice(0, limit) : posts;

   // Determine nextCursor and last
   const nextCursor = hasMore ? (page + 1).toString() : null;
   const last = Math.ceil(totalCount / limit);

   return {
     items,
     nextCursor,
     last,
     totalCount,
   };
 };

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

const likePost = async (postId: string, userId: string): Promise<boolean> => {
  const objectId = new mongoose.Types.ObjectId(userId);

  // Check if user already liked the post
  const alreadyLiked = await PostModel.exists({ _id: postId, likes: objectId });
  if (alreadyLiked) return false;

  // Add user to likes
  const result = await PostModel.updateOne(
    { _id: postId },
    { $push: { likes: objectId } }
  );

  return result.modifiedCount > 0;
};

const unlikePost = async (postId: string, userId: string): Promise<boolean> => {
  const objectId = new mongoose.Types.ObjectId(userId);

  // Check if user already liked the post
  const alreadyLiked = await PostModel.exists({ _id: postId, likes: objectId });
  if (!alreadyLiked) return false;

  // Remove user from likes
  const result = await PostModel.updateOne(
    { _id: postId },
    { $pull: { likes: objectId } }
  );

  return result.modifiedCount > 0;
};

const addComment = async (postId: string, userId: string, comment: string): Promise<boolean> => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const result = await PostModel.updateOne(
    { _id: postId },
    { $push: { comments: { _id: new mongoose.Types.ObjectId(), author: objectId, content: comment, createdAt: new Date().toISOString() } } }
  );
  return result.modifiedCount > 0;
};

const deleteComment = async (postId: string, commentId: string, authorId: string): Promise<boolean> => {
  const result = await PostModel.updateOne(
    { _id: postId },
    { $pull: { comments: { _id: commentId, author: authorId } } }
  )
  return result.modifiedCount > 0;
};

const getComments = async (
  postId: string,
  page = 1,
  limit = 20
) => {
  const skip = (page - 1) * limit;

  const post = await PostModel.findById(postId)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (!post) return [];

  const commentsWithAuthors = (await Promise.all(
    post.comments.map(async (comment) => {
      const author = await UserModel.findById(comment.author).select('-googleId').lean();

      if (!author) return undefined;

      return {
        ...author,
        commentId: comment._id,
        commentContent: comment.content,
        commentCreatedAt: comment.createdAt,
        commentAuthorId: comment.author,
      };
    })
  )).filter((commentsWithAuthors) => commentsWithAuthors !== undefined);

  return commentsWithAuthors;
};

export const PostService = {
  createPost,
  getPostById,
  getUserPosts,
  getFeedPosts,
  deletePost,
  uploadImage,
  likePost,
  unlikePost,
  addComment,
  deleteComment,
  getComments
}