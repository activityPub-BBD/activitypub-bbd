import { requireAuth } from '@middleware/auth.ts';
import type { IPost } from '@models/post.ts';
import { HTTP_STATUS } from '@utils/httpStatus.ts';
import { Router } from 'express';
import multer from 'multer';
import { PostService } from 'services/postService.ts';
import type { IPostResponse } from 'types/post.ts';

export const postRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter: (req: any, file: any, cb: any ) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});


/**
 * @route POST api/posts
 * @description Create and upload a post
 */
postRoutes.post('/', requireAuth, upload.single('image'), async (req, res) => {
  
  try {
    const { caption } = req.body;
    
    if (!caption) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Caption is required' });
    }

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Image is required' });
    }

    if (caption.length > 2200) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Caption must be 2200 characters or less' });
    }

    const mediaUrl = await PostService.uploadImage(
      req.file.buffer,
      req.file.mimetype,
      req.user!.id
    );

    const post = await PostService.createPost({
      authorId: req.user!.id,
      caption,
      mediaUrl,
      mediaType: req.file.mimetype,
    });


    const populatedPost = await PostService.getPostById(post.id);
    console.log('POST')
    console.log(populatedPost)
    
    if (!populatedPost) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve created post' });
    }

    const response: IPostResponse = {
      id: populatedPost._id.toString(),
      author: {
        id: populatedPost.author._id.toString(),
        displayName: populatedPost.author.displayName,
        avatarUrl: populatedPost.author.avatarUrl,
      },
      caption: populatedPost.caption,
      mediaUrl: populatedPost.mediaUrl,
      mediaType: populatedPost.mediaType,
      activityPubUri: populatedPost.activityPubUri,
      likesCount: populatedPost.likesCount,
      isLiked: false,
      createdAt: populatedPost.createdAt,
    };

    res.status(HTTP_STATUS.CREATED).json(response);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create post' });
  }
});

/**
 * @route GET api/posts/feed
 * @description Retrieve all posts (optionally paginated)
 */
postRoutes.get('/feed', requireAuth, async (req, res) => {
  try {
    const  { ownFeed } = req.body;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const posts = ownFeed ?
      await PostService.getFeedPosts(req.user!.id, page, limit) :
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
 * @route DELETE api/posts/:id
 * @description Delete a post by its ID (must be the author)
 */
postRoutes.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await PostService.deletePost(id, req.user!.id);

    if (!success) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete post' });
  }
});

export default postRoutes;