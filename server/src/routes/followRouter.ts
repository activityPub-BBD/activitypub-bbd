import { requireAuth } from "@middleware/auth";
import { Router } from "express";
import { FollowService } from "@services/followService";
import { HTTP_STATUS } from "@utils/httpStatus";
import type { IUser } from "@models/user";

/**
 * Express router for handling follow-related routes.
 * Includes endpoints for follow summaries, following/unfollowing users,
 * retrieving followers/following, and suggested mutuals.
 */
export const followRoutes = Router();

/**
 * @route GET /follow-summary/:oid
 * @description Retrieves follow statistics for a specific user by ID.
 * @param {string} oid - Object ID of the target user.
 * @returns {Object} JSON follow statistics or error.
 */
followRoutes.get("/follow-summary/:oid", async (req, res) => {
    try {
        const oid = req.params.oid;
        const followStats = await FollowService.getFollowStats(oid);
        res.status(HTTP_STATUS.OK).json(followStats);
    } catch (error) {
        console.error('Error retrieving follow stats:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /follow-summary
 * @description Retrieves follow statistics for the authenticated user.
 * @requires Authentication
 * @returns {Object} JSON follow statistics or error.
 */
followRoutes.get("/follow-summary", requireAuth, async (req, res) => {
    try {
        const user: IUser | null = res.locals.user;
        if (!user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }
        const followStats = await FollowService.getFollowStats(user.id);
        res.status(HTTP_STATUS.OK).json(followStats);
    } catch (error) {
        console.error('Error retrieving follow stats:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route POST /follow/:oid/:accepted
 * @description Follow or accept follow for a specific user.
 * @param {string} oid - Object ID of the target user.
 * @param {string} accepted - Boolean string ('true' or 'false') indicating whether the follow is accepted.
 * @requires Authentication
 * @returns {void|Object} 201 Created or error message.
 */
followRoutes.post("/follow/:oid/:accepted", requireAuth, async (req, res) => {
    try {
        const accepted = req.params.accepted === 'true';
        const oid = req.params.oid;
        const user: IUser | null = res.locals.user;

        if (!user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        if (!oid || !req.params.accepted) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        }

        const follow = await FollowService.followUser(user.id, oid, accepted);
        if (!follow) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Failed to follow user' });
        }
        return res.status(HTTP_STATUS.CREATED).end();
    } catch (error) {
        console.error('Error following user:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route DELETE /unfollow/:oid
 * @description Unfollow a user.
 * @body {string} oid - Object ID of the user to unfollow.
 * @requires Authentication
 * @returns {void|Object} 200 OK or error message.
 */
followRoutes.delete("/unfollow/:oid", requireAuth, async (req, res) => {
    try {
        const oid = req.params.oid;
        const user: IUser | null = res.locals.user;
        if (!user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else if (!oid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        } else{
            const unfollow = await FollowService.unfollowUser(user.id, oid);
            if (!unfollow) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Failed to unfollow user' });
            } else{
                return res.status(HTTP_STATUS.OK).end();
            }
        }
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /following/:oid
 * @description Retrieve a list of users that the specified user is following.
 * @param {string} oid - Object ID of the user.
 * @requires Authentication
 * @returns {Array<Object>} List of following users or error.
 */
followRoutes.get("/following/:oid", requireAuth, async (req, res) => {
    try {
        const oid = req.params.oid;
        if (!oid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        } else{
            const following = await FollowService.retrieveFollowing(oid);
            res.status(HTTP_STATUS.OK).json(following);
        }
    } catch (error) {
        console.error('Error retrieving following:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /following
 * @description Retrieve a list of users that the authenticated user is following.
 * @requires Authentication
 * @returns {Array<Object>} List of following users or error.
 */
followRoutes.get("/following", requireAuth, async (req, res) => {
    try {
        const user: IUser | null = res.locals.user;
        if (!user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        const following = await FollowService.retrieveFollowing(user.id);
        res.status(HTTP_STATUS.OK).json(following);
    } catch (error) {
        console.error('Error retrieving following:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /followers/:oid
 * @description Retrieve a list of users following the specified user.
 * @param {string} oid - Object ID of the user.
 * @requires Authentication
 * @returns {Array<Object>} List of followers or error.
 */
followRoutes.get("/followers/:oid", requireAuth, async (req, res) => {
    try {
        const oid = req.params.oid;
        if (!oid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        } else{
            const followers = await FollowService.retrieveFollowers(oid);
            res.status(HTTP_STATUS.OK).json(followers);
        }
    } catch (error) {
        console.error('Error retrieving followers:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /followers
 * @description Retrieve a list of users following the authenticated user.
 * @requires Authentication
 * @returns {Array<Object>} List of followers or error.
 */
followRoutes.get("/followers", requireAuth, async (req, res) => {
    try {
        const user: IUser | null = res.locals.user;
        if (!user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        const followers = await FollowService.retrieveFollowers(user.id);
        res.status(HTTP_STATUS.OK).json(followers);
    } catch (error) {
        console.error('Error retrieving followers:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /suggested-mutuals/:oid
 * @description Retrieve suggested mutual connections for a specific user.
 * @param {string} oid - Object ID of the user.
 * @requires Authentication
 * @returns {Array<Object>} List of suggested mutuals or error.
 */
followRoutes.get("/suggested-mutuals/:oid", requireAuth, async (req, res) => {
    try {
        const oid = req.params.oid;
        if (!oid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        } else{
            const suggestedMutuals = await FollowService.retrieveSuggestedMutuals(oid);
            res.status(HTTP_STATUS.OK).json(suggestedMutuals);
        }
    } catch (error) {
        console.error('Error retrieving suggested mutuals:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /suggested-mutuals
 * @description Retrieve suggested mutual connections for the authenticated user.
 * @requires Authentication
 * @returns {Array<Object>} List of suggested mutuals or error.
 */
followRoutes.get("/suggested-mutuals", requireAuth, async (req, res) => {
    try {
        const user: IUser | null = res.locals.user;
        if (!user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        const suggestedMutuals = await FollowService.retrieveSuggestedMutuals(user.id);
        res.status(HTTP_STATUS.OK).json(suggestedMutuals);
    } catch (error) {
        console.error('Error retrieving suggested mutuals:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

export default followRoutes;
