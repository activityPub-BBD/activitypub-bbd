import { requireAuth } from '@middleware/auth.ts';
import { HTTP_STATUS } from '@utils/httpStatus.ts';
import { Router } from 'express';
import multer from 'multer';
import { PostService } from '@services/postService.ts';
import type { IPostResponse } from 'types/post.ts';
import { federation } from "@federation/index.ts";
import { Create, Note } from "@fedify/fedify";
import { config } from "@config/config.ts";

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
    const fullUrl = `https://${config.domain}${req.originalUrl}`;
    let requestBody: any = undefined;
    if (!["GET", "HEAD"].includes(req.method)) {
      requestBody = req.body ? JSON.stringify(req.body) : undefined;
    }
    const fetchRequest = new Request(fullUrl, {
      method: req.method,
      headers: req.headers as any,
      body: requestBody,
    });
    const ctx = federation.createContext(fetchRequest, undefined);

    const { caption } = req.body;

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
        res.locals.user!.id
      );
      mediaType = req.file.mimetype;
    }
    

    const post = await PostService.createPost({
      authorId: res.locals.user!.id,
      caption,
      mediaUrl,
      mediaType,
    });

    const populatedPost = await PostService.getPostById(post.id);


    if (!populatedPost) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: "Failed to retrieve created post" });
    }

    try {
      const username = populatedPost.author.username;
      const noteArgs = { identifier: username, id: post.id.toString() };

      const note = await ctx.getObject(Note, noteArgs);

      if (note) {
        await ctx.sendActivity(
          { identifier: username },
          "followers",
          new Create({
            id: new URL(`#activity`, note?.id ?? undefined),
            object: note,
            actors: note?.attributionIds,
            tos: note?.toIds,
            ccs: note?.ccIds,
          })
        );
      }
    } catch (federationError) {
      console.error("Failed to send Create(Note) activity:", federationError);
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
 * @route GET api/posts/feed
 * @description Retrieve all posts (optionally paginated)
 */
postRoutes.get('/feed', requireAuth, async (req, res) => {
  try {
    const  { ownFeed } = req.body;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const posts = ownFeed ?
      await PostService.getFeedPosts(res.locals.user!.id, page, limit) :
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

    const success = await PostService.deletePost(id, res.locals.user!.id);

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