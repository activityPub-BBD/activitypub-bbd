import { requireAuth } from "@middleware/auth";
import type { IUser } from "@models/index";
import { HTTP_STATUS } from "@utils/httpStatus";
import { Router } from "express";
import { PostService } from "@services/postService";
import { UserService } from "@services/userService";
import { config } from "@config/config";
import { federation } from "@federation/index";
import { isActor, type Actor } from "@fedify/fedify";

export const userRoutes = Router();

/**
 * @route GET /api/users/search
 * @description Search for users by query string
 * Requires authentication.
 */
userRoutes.get('/search', requireAuth, async (req, res) => {
  const query = req.query.q as string;

  if (!query || query.trim() === '') {
    // Return first 5 users when query is empty
    try {
      const localUsers = await UserService.getFirstUsers(5, config.domain);
      const localResults = localUsers.map(user => ({
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isRemote: false,
        domain: user.domain || config.domain,
        actorId: user.actorId,
      }));
      
      res.json(localResults);
    } catch (error) {
      console.error('Error fetching first users:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
    return;
  }

  try {
    const results = [];
    
    if (query.includes('@')) {
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

        // Try to lookup the remote user with @ prefix for Fedify
        const fedifyQuery = `@${query}`;
        const remoteUser = await ctx.lookupObject(fedifyQuery);
        
        if (remoteUser && isActor(remoteUser) && remoteUser.id) {
          let localUser = await UserService.getUserByActorId(remoteUser.id.toString());
          
          if (!localUser) {
            const actorData = {
              actorId: remoteUser.id.toString(),
              username: remoteUser.preferredUsername?.toString() || remoteUser.name?.toString() || query.split('@')[0],
              domain: query.includes('@') ? query.split('@')[1] : config.domain,
              displayName: remoteUser.name?.toString() || remoteUser.preferredUsername?.toString() || query.split('@')[0],
              inboxUrl: remoteUser.inboxId?.toString() || '',
              outboxUrl: remoteUser.outboxId?.toString() || '',
              followersUrl: remoteUser.followersId?.toString() || '',
              followingUrl: remoteUser.followingId?.toString() || '',
              bio: remoteUser.summary?.toString() || '',
              avatarUrl: '', 
            };
            
            localUser = await UserService.createRemoteUser(actorData);
          }
          
          results.push({
            id: localUser._id,
            username: localUser.username,
            displayName: localUser.displayName,
            avatarUrl: localUser.avatarUrl,
            isRemote: true,
            domain: localUser.domain,
            actorId: localUser.actorId,
          });
        }
      } catch (federationError) {
        console.error('Fedify lookup error:', federationError);
      }
    }
    
    const localUsers = await UserService.searchUsers(query, config.domain);
    const localResults = localUsers.map(user => ({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isRemote: false,
      domain: user.domain || config.domain,
      actorId: user.actorId,
    }));
    
    const allResults = [...results, ...localResults];
    const uniqueResults = allResults.filter((user, index, self) => 
      index === self.findIndex(u => u.actorId === user.actorId)
    );
    
    res.json(uniqueResults);
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
    // The user should already be available from the auth middleware
    const user: IUser | null = res.locals.user;
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

    const userId = res.locals.user!._id.toString();
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
    const user = await UserService.getUserByUsername(username, config.domain);
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
    const user = await UserService.getUserByUsername(username, config.domain);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    // Get posts by user ID, paginated
    const posts = await PostService.getUserPosts(user._id.toString(), page, limit);
    console.log(posts)
    res.status(HTTP_STATUS.OK).json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});

export default userRoutes;