import { requireAuth } from '@middleware/auth';
import { HTTP_STATUS } from '@utils/httpStatus';
import { Router } from 'express';
import multer from 'multer';
import { PostService } from '@services/postService';
import type { IPostResponse } from 'types/post';
import { federation } from "@federation/index";
import { Create, Note } from "@fedify/fedify";
import { config } from "@config/config";
import { FollowService } from '@services/followService';
import type { IUser } from '@models/user';

export const postRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, WebP images and MP4, WebM videos are allowed."
        )
      );
    }
  },
});


/**
 * @route POST api/posts
 * @description Create and upload a post
 */
postRoutes.post("/", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const federationContext = (req as any).federationContext;
    const { caption } = req.body;
    const user: IUser | null = res.locals.user;

    if (!caption) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Caption is required' });
    }

    if (caption.length > 2200) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Caption must be 2200 characters or less' });
    }

    let mediaUrl = ''
    let mediaType = ''
    if (req.file) {
      mediaUrl = await PostService.uploadImage(
        req.file.buffer,
        req.file.mimetype,
        user!._id.toString()
      );
      mediaType = req.file.mimetype;
    }
    

    const post = await PostService.createPost({
      authorId: user!._id.toString(),
      caption,
      mediaUrl,
      mediaType,
    }, federationContext);

    const populatedPost = await PostService.getPostById(post.id);

    if (!populatedPost) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: "Failed to retrieve created post" });
    }

    const response: IPostResponse = {
      id: populatedPost.id,
      author: {
        id: populatedPost.author.id,
        displayName: populatedPost.author.displayName,
        avatarUrl: populatedPost.author.avatarUrl,
      },
      caption: populatedPost.caption,
      mediaUrl: populatedPost.mediaUrl,
      mediaType: populatedPost.mediaType,
      activityPubUri: populatedPost.activityPubUri,
      likesCount: populatedPost.likesCount,
      likes: [],
      createdAt: populatedPost.createdAt,
    };

    res.status(HTTP_STATUS.CREATED).json(response);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create post' });
  }
});

/**
 * @route POST api/posts/feed
 * @description Retrieve all posts (optionally paginated)
 */
postRoutes.post('/feed', requireAuth, async (req, res) => {
  try {
    const user: IUser | null = res.locals.user;
    const  { ownFeed } = req.body;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const posts = ownFeed ?
      await PostService.getFeedPosts(user!._id.toString(), page, limit) :
      await PostService.getFeedPosts('', page, limit);

    res.json({
      posts: posts,
      page,
      limit,
      hasMore: [].length === limit,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * @route GET api/posts/following
 * @description Retrieve all posts from followed users (optionally paginated)
 */
postRoutes.get('/following', requireAuth, async (req, res) => {
  try {
    const user: IUser | null = res.locals.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const following = await FollowService.retrieveFollowing(user!._id.toString());

    const posts = await PostService.getNewestPostFromFollowing(following.map((f) => f.id), page, limit);

    res.json({
      posts: posts,
      page,
      limit,
      hasMore: [].length === limit,
    });
  } catch (error) {
    console.error('Get following posts error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch following posts' });
  }
});

/**
 * @route GET api/posts/following/trending
 * @description Retrieve popular posts from followed users (optionally paginated)
 */
postRoutes.get('/following/trending', requireAuth, async (req, res) => {
  try {
    const user: IUser | null = res.locals.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const following = await FollowService.retrieveFollowing(user!._id.toString());

    const posts = await PostService.getMostLikedPostFromFollowing(following.map((f) => f.id), page, limit);

    res.json({
      posts: posts,
      page,
      limit,
      hasMore: [].length === limit,
    });
  } catch (error) {
    console.error('Get following posts error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch following posts' });
  }
});

/**
 * @route DELETE api/posts/:id
 * @description Delete a post by its ID (must be the author)
 */
postRoutes.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user: IUser | null = res.locals.user;

    const success = await PostService.deletePost(id, user!._id.toString());

    if (!success) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete post' });
  }
});

/**
 * @route POST api/posts/like/:id
 * @description Like a post by its ID
 */
postRoutes.post('/like/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user: IUser | null = res.locals.user;
    const success = await PostService.likePost(id, user!._id.toString());
    if (!success) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Unable to like post' });
    }
    res.status(HTTP_STATUS.CREATED).end();
  } catch (error) {
    console.error('Like post error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to like post' });
  }
});

/**
 * @route DELETE api/posts/like/:id
 * @description Unlike a post by its ID
 */
postRoutes.delete('/like/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user: IUser | null = res.locals.user;
    const success = await PostService.unlikePost(id, user!._id.toString());
    if (!success) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Unable to unlike post' });
    }
    res.status(HTTP_STATUS.OK).end();
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to unlike post' });
  }
});

/**
 * @route GET api/posts/comments/:id
 * @description Retrieve comments for a post (optionally paginated)
 */
postRoutes.get('/comments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const comments = await PostService.getComments(id, page, limit);
    res.status(HTTP_STATUS.OK).json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * @route POST api/posts/comments/:id
 * @description Create a comment on a post
 */
postRoutes.post('/comments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const user: IUser | null = res.locals.user;
    const success = await PostService.addComment(id, user!.id, comment);
    if (!success) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Unable to add comment' });
    }
    res.status(HTTP_STATUS.CREATED).end();
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add comment' });
  }
});

/**
 * @route DELETE api/posts/comments/:id/:commentId
 * @description Delete a comment on a post
 */
postRoutes.delete('/comments/:id/:commentId', requireAuth, async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const user: IUser | null = res.locals.user;
    const success = await PostService.deleteComment(id, commentId, user!.id);
    if (!success) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Unable to delete comment' });
    }
    res.status(HTTP_STATUS.OK).end();
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete comment' });
  }
});

export default postRoutes;