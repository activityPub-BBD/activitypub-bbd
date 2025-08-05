import { requireAuth } from "@middleware/auth";
import { Router } from "express";
import { FollowService } from "@services/followService";
import { HTTP_STATUS } from "@utils/httpStatus";
import { UserService } from "@services/userService";
import { Follow, Undo } from "@fedify/fedify";

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
        if (!res.locals.user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }
        const followStats = await FollowService.getFollowStats(res.locals.user.id);
        res.status(HTTP_STATUS.OK).json(followStats);
    } catch (error) {
        console.error('Error retrieving follow stats:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route POST /follow/:oid
 * @description Follow a specific user.
 * @param {string} oid - Object ID of the target user.
 * @requires Authentication
 * @returns {void|Object} 201 Created or error message.
 */
followRoutes.post("/follow/:oid", requireAuth, async (req, res) => {
    try {
        const oid = req.params.oid;

        if (!res.locals.user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        if (!oid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        }

        // Get the target user to check if they are local or remote
        const targetUser = await UserService.getUserByObjectId(oid);
        
        if (!targetUser) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
        }

        // If target user is remote, we need to send a federated follow activity
        if (!targetUser.isLocal) {
            const federationContext = (req as any).federationContext;
            if (!federationContext) {
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Federation context not available' });
            }

            // Get the current user
            const currentUser = await UserService.getUserByObjectId(res.locals.user.id);
            if (!currentUser) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Current user not found' });
            }

            try {
                const actor = await federationContext.lookupObject(targetUser.actorId);
                if (actor) {
                    await federationContext.sendActivity(
                        { identifier: currentUser.username },
                        actor,
                        new Follow({
                            actor: federationContext.getActorUri(currentUser.username),
                            object: actor.id,
                            to: actor.id,
                        }),
                    );
                    console.log(`Sent federated follow activity from ${currentUser.username} to ${targetUser.username}`);
                }
            } catch (federationError) {
                console.error('Federation error:', federationError);
                // Still create the local follow relationship even if federation fails
            }
        }

        const follow = await FollowService.followUser(res.locals.user.id, oid, true);
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
        if (!res.locals.user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else if (!oid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        } else {
            // Get the target user to check if they are local or remote
            const targetUser = await UserService.getUserByObjectId(oid);
            
            if (!targetUser) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
            }

            // If target user is remote, we need to send a federated undo activity
            if (!targetUser.isLocal) {
                const federationContext = (req as any).federationContext;
                if (!federationContext) {
                    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Federation context not available' });
                }

                // Get the current user
                const currentUser = await UserService.getUserByObjectId(res.locals.user.id);
                if (!currentUser) {
                    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Current user not found' });
                }

                try {
                    const actor = await federationContext.lookupObject(targetUser.actorId);
                    if (actor) {
                        const previousFollow = new Follow({
                            actor: federationContext.getActorUri(currentUser.username),
                            object: actor.id,
                            to: actor.id,
                        });
                        
                        await federationContext.sendActivity(
                            { identifier: currentUser.username },
                            actor,
                            new Undo({
                                actor: federationContext.getActorUri(currentUser.username),
                                object: previousFollow,
                                to: actor.id,
                            }),
                        );
                        console.log(`Sent federated undo activity from ${currentUser.username} to ${targetUser.username}`);
                    }
                } catch (federationError) {
                    console.error('Federation error:', federationError);
                    // Still unfollow locally even if federation fails
                }
            }

            const unfollow = await FollowService.unfollowUser(res.locals.user.id, oid);
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
        if (!res.locals.user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        const following = await FollowService.retrieveFollowing(res.locals.user.id);
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
        if (!res.locals.user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        const followers = await FollowService.retrieveFollowers(res.locals.user.id);
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
        if (!res.locals.user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }

        const suggestedMutuals = await FollowService.retrieveSuggestedMutuals(res.locals.user.id);
        res.status(HTTP_STATUS.OK).json(suggestedMutuals);
    } catch (error) {
        console.error('Error retrieving suggested mutuals:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /is-following/:oid
 * @description Check if the authenticated user is following a specific user.
 * @param {string} oid - Object ID of the target user.
 * @requires Authentication
 * @returns {Object} JSON with isFollowing boolean or error.
 */
followRoutes.get("/is-following/:oid", requireAuth, async (req, res) => {
    try {
        const oid = req.params.oid;
        if (!res.locals.user?.id) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }
        if (!oid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required parameters' });
        }
        
        const isFollowing = await FollowService.isFollowing(res.locals.user.id, oid);
        res.status(HTTP_STATUS.OK).json({ isFollowing });
    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

export default followRoutes;
