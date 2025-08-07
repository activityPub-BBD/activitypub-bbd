import { requireAuth } from "@middleware/auth";
import type { IUser } from "@models/index";
import { HTTP_STATUS } from "@utils/httpStatus";
import { Router } from "express";
import { PostService } from "@services/postService";
import { UserService } from "@services/userService";
import { config } from "@config/config";
import { federation } from "@federation/index";
import { isActor, type Actor } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
export const userRoutes = Router();

const logger = getLogger("server");
/**
 * Maps a user object to the standard response format
 */
const mapUserToResponse = (user: any) => ({
  id: user._id,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  isRemote: !user.isLocal,
  domain: user.domain || config.domain,
  actorId: user.actorId,
});

/**
 * Maps a user object to profile response format
 */
const mapUserToProfileResponse = (user: any) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  joinDate: user.createdAt,
  activityPubId: user.actorId,
});

/**
 * Creates federation context for remote user lookup
 */
const createFederationContext = (req: any) => {
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
  logger.debug("====FETCH REQUEST====")
  logger.debug(JSON.stringify(fetchRequest));
  return federation.createContext(fetchRequest, undefined);
};

/**
 * Creates actor data from remote user
 */
const createActorData = (remoteUser: Actor, username: string) => ({
  actorId: remoteUser.id?.toString() || '',
  username: remoteUser.preferredUsername?.toString() || username.split('@')[0],
  domain: username.includes('@') ? username.split('@')[1] : config.domain,
  displayName: remoteUser.name?.toString() || remoteUser.preferredUsername?.toString() || username.split('@')[0],
  inboxUrl: remoteUser.inboxId?.toString() || '',
  outboxUrl: remoteUser.outboxId?.toString() || '',
  followersUrl: remoteUser.followersId?.toString() || '',
  followingUrl: remoteUser.followingId?.toString() || '',
  bio: remoteUser.summary?.toString() || '',
  avatarUrl: '', 
});

/**
 * Handles federation lookup for remote users
 */
const handleFederationLookup = async (req: any, query: string) => {
  try {
    const ctx = createFederationContext(req);
    
    const fedifyQuery = `@${query}`;
    logger.debug("====FEDIFY QUEERY====")
    logger.debug(fedifyQuery)
    const remoteUser = await ctx.lookupObject(fedifyQuery);
    logger.debug(JSON.stringify(remoteUser));
    
    if (remoteUser && isActor(remoteUser) && remoteUser.id) {
      let localUser = await UserService.getUserByActorId(remoteUser.id.toString());
      console.log(remoteUser)
      if (!localUser) {
        
        const actorData = createActorData(remoteUser, query);
        localUser = await UserService.createRemoteUser(actorData);
        //add user to graph db
        await UserService.addUserToGraphDb(localUser);
      }
      
      return localUser;
    }
  } catch (federationError) {
    console.error('Fedify lookup error:', federationError);
  }
  return null;
};

/**
 * Handles federation lookup for username-based queries
 */
const handleUsernameFederationLookup = async (req: any, username: string) => {
  try {
    const ctx = createFederationContext(req);
    const fedifyQuery = `@${username}`;
    const remoteUser = await ctx.lookupObject(fedifyQuery);
    
    if (remoteUser && isActor(remoteUser) && remoteUser.id) {
      let user = await UserService.getUserByActorId(remoteUser.id.toString());
      
      if (!user) {
        logger.debug('User is not local. Creating actor...');
        console.log(remoteUser)
        const actorData = createActorData(remoteUser, username);
        user = await UserService.createRemoteUser(actorData);
        //add user to graph db
        await UserService.addUserToGraphDb(user);
      }
      
      return user;
    }
  } catch (federationError) {
    console.error('Fedify lookup error:', federationError);
  }
  return null;
};

/**
 * Standard error response handler
 */
const handleError = (res: any, error: any, message: string) => {
  console.error(message, error);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
};

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
      const localResults = localUsers.map(mapUserToResponse);
      
      res.json(localResults);
    } catch (error) {
      handleError(res, error, 'Error fetching first users:');
    }
    return;
  }

  try {
    const results = [];
    
    if (query.includes('@')) {
      const remoteUser = await handleFederationLookup(req, query);
      if (remoteUser) {
        results.push(mapUserToResponse(remoteUser));
      }
    }
    

    const localUsers = await UserService.searchUsers(query, config.domain);
    const localResults = localUsers.map(mapUserToResponse);
    
    const allResults = [...results, ...localResults];
    const uniqueResults = allResults.filter((user, index, self) => 
      index === self.findIndex(u => u.actorId === user.actorId)
    );
    
    res.json(uniqueResults);
  } catch (error) {
    handleError(res, error, 'Error searching users:');
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
    handleError(res, error, 'Error retrieving current user:');
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
    handleError(res, error, "Error updating user profile:");
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
    
    // First try to get the user as a local user
    let user = await UserService.getUserByUsername(username, config.domain);
    
    // If not found locally and username contains @, try to lookup as remote user
    if (!user && username.includes('@')) {
      user = await handleUsernameFederationLookup(req, username);
    }
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }
    
    res.json(mapUserToProfileResponse(user));
  } catch (error) {
    handleError(res, error, 'Error retrieving user profile:');
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

    let user = await UserService.getUserByUsername(username, config.domain);
    
    if (!user && username.includes('@')) {
      user = await handleUsernameFederationLookup(req, username);
    }

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    const posts = await PostService.getUserPosts(user._id.toString(), page, limit);
    console.log(posts)
    res.status(HTTP_STATUS.OK).json(posts);
  } catch (error) {
    handleError(res, error, 'Error fetching user posts:');
  }
});

export default userRoutes;