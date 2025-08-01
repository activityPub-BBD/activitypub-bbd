import type { IPost } from '@models/post.ts';
import type { IUser } from '@models/user.ts';
import { Router } from 'express';
import { Types } from 'mongoose';
import multer from 'multer';
import { createPost, deletePost, getFeedPosts, getPostById, getUserPosts, uploadImage } from 'services/postService.ts';
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


// baseURL/posts/
postRoutes.post('/', upload.single('image'), async (req, res) => {
  
  try {
    const { caption } = req.body;
    
    if (!caption) {
      return res.status(400).json({ error: 'Caption is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    if (caption.length > 2200) {
      return res.status(400).json({ error: 'Caption must be 2200 characters or less' });
    }

    const mediaUrl = await uploadImage(
      req.file.buffer,
      req.file.mimetype,
      req.user!._id!.toString()
    );

    const post = await createPost({
      authorId: req.user!._id!.toString(),
      caption,
      mediaUrl,
      mediaType: req.file.mimetype,
    });

    const populatedPost = await getPostById(post._id.toString());
    
    if (!populatedPost) {
      return res.status(500).json({ error: 'Failed to retrieve created post' });
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
      activityPubURI: populatedPost.activityPubURI,
      likesCount: populatedPost.likesCount,
      isLiked: false,
      createdAt: populatedPost.createdAt,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// baseURL/posts/user/:username
postRoutes.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    //TODO: Find username in user service
    const user = null
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    //TODO: Find posts by user
    //const posts = await getUserPosts(user._id.toString(), page, limit);

    res.json({
      posts: [],
      page,
      limit,
      hasMore: [].length === limit,
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// Get feed
// baseURL/posts/
postRoutes.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    //get req.user from auth
    // const posts = req.user ?
    //   await getFeedPosts(req.user._id!.toString(), page, limit) :
    //   await getFeedPosts('', page, limit);

    res.json({
      posts: [],
      page,
      limit,
      hasMore: [].length === limit,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Delete post
// baseURL/posts/:id
postRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    //get req.user from auth
    //const success = await deletePost(id, req.user!._id!.toString());
    const success = false;

    if (!success) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default postRoutes;