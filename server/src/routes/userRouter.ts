import { requireAuth } from "@middleware/auth.ts";
import type { IUser } from "@models/index.ts";
import { HTTP_STATUS } from "@utils/httpStatus.ts";
import { Router } from "express";
import { PostService } from "@services/postService.ts";
import { UserService } from "@services/userService.ts";

export const userRoutes = Router();

/**
 * @route GET /api/users/search
 * @description Search for users by query string
 * Requires authentication.
 */
userRoutes.get('/search', requireAuth, async (req, res) => {
  const query = req.query.q as string;

  if (!query || query.trim() === '') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Query string is required' });
  }

  try {
    const users = await UserService.searchUsers(query);
    res.json(
      users.map(user => ({
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }))
    );
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/users/me
 * @description Get current authenticated user's profile
 * Requires authentication.
 */
userRoutes.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await UserService.getUserByGoogleId(res.locals.user!.googleId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }
    res.json({
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      joinDate: user.createdAt,
      activityPubId: user.actorId,
    });
  } catch (error) {
    console.error('Error retrieving current user:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});

/**
 * @route PUT /api/users/me
 * @middleware requireAuth
 * @description Update current user's profile
 * Requires authentication.
*/
userRoutes.put('/me', requireAuth, async (req, res) => {
  try {

    const userId = res.locals.user!.id;
    const updates: Partial<IUser> = {};

    if (typeof req.body.displayName === 'string') {
      updates.displayName = req.body.displayName;
    }

    if (typeof req.body.bio === 'string' || req.body.bio === null) {
      updates.bio = req.body.bio;
    }

    if (typeof req.body.avatarUrl === 'string' || req.body.avatarUrl === null) {
      updates.avatarUrl = req.body.avatarUrl;
    }

    if (typeof req.body.location === 'string' || req.body.location === null) {
      updates.location = req.body.location;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const updated = await UserService.updateUser(userId, updates);
    if (!updated) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: "User not found" });
    }

    if (!updated) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: "User not found" });
    }

    const responseUser: Partial<typeof updated> = { username: updated.username };
    // Include only the fields that were updated
    if ('displayName' in updates) responseUser.displayName = updated.displayName;
    if ('bio' in updates) responseUser.bio = updated.bio;
    if ('location' in updates) responseUser.location = updated.location;
    if ('avatarUrl' in updates) responseUser.avatarUrl = updated.avatarUrl;

    res.status(HTTP_STATUS.OK).json({
        message: "Profile updated successfully",
        user: responseUser,
    });

  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /api/users/:username
 * @middleware requireAuth
 * @description Retrieves a public profile for a user by their username.
 * Requires authentication.
*/
userRoutes.get('/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await UserService.getUserByUsername(username);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }
    
    res.json({
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      joinDate: user.createdAt,
      activityPubId: user.actorId,
    });
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /users/:username/posts
 * @desc Get posts created by a specific user
 * @query page (optional) - page number for pagination (default: 1)
 * @query limit (optional) - posts per page (default: 20)
 */
userRoutes.get('/:username/posts', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    // Find user by username
    const user = await UserService.getUserByUsername(username);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    // Get posts by user ID, paginated
    const posts = await PostService.getUserPosts(user.id, page, limit);
    console.log(posts)
    res.status(HTTP_STATUS.OK).json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});

export default userRoutes;