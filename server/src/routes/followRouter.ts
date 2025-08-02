import { requireAuth } from "@middleware/auth.ts";
import { Router } from "express";
import { FollowService } from "@services/followService.ts";
import { HTTP_STATUS } from "@utils/httpStatus.ts";

export const followRoutes = Router();

followRoutes.get("/follow-summary/:oid", async(req, res) => {
    try{
        const oid = req.params.oid;
        const followStats = await FollowService.getFollowStats(oid);
        res.status(HTTP_STATUS.OK).json(followStats);
    } catch (error) {
        console.error('Error retrieving follow stats:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

followRoutes.get("/follow-summary", requireAuth, async(req, res) => {
    try{
        if(!res.locals.user){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }else if(!res.locals.user.id){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else {
            const followStats = await FollowService.getFollowStats(res.locals.user.id);
            res.status(HTTP_STATUS.OK).json(followStats);
        }
    } catch (error) {
        console.error('Error retrieving follow stats:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

followRoutes.post("/follow:oid", requireAuth, async(req, res) => {
    try{
        const { inboxUrl, accepted } = req.body;
        if(!res.locals.user){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }else if(!res.locals.user.id){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else {
            const { oid } = req.body;
            const follow = await FollowService.followUser(res.locals.user.id, oid, inboxUrl, accepted);
            if(!follow){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Failed to follow user' });
            } else{
                return res.status(HTTP_STATUS.CREATED);
            }
        }
    } catch (error) {
        console.error('Error following user:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
})

followRoutes.delete("/unfollow/:oid", requireAuth, async(req, res) => {
    try{
        if(!res.locals.user){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }else if(!res.locals.user.id){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else {
            const { oid } = req.body;
            const unfollow = await FollowService.unfollowUser(res.locals.user.id, oid);
            if(!unfollow){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Failed to unfollow user' });
            } else{
                return res.status(HTTP_STATUS.OK);
            }
        }
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
})

followRoutes.get("/following:oid", requireAuth, async(req, res) => {
    try{
        const oid = req.params.oid;
        const following = await FollowService.retrieveFollowing(oid);
        res.status(HTTP_STATUS.OK).json(following);
    } catch (error) {
        console.error('Error retrieving following:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

followRoutes.get("/following", requireAuth, async(req, res) => {
    try{
        if(!res.locals.user){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }else if(!res.locals.user.id){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else {
            const following = await FollowService.retrieveFollowing(res.locals.user.id);
            res.status(HTTP_STATUS.OK).json(following);
        }
    } catch (error) {
        console.error('Error retrieving following:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

followRoutes.get("/followers/:oid", requireAuth, async(req, res) => {
    try{
        const oid = req.params.oid;
        const followers = await FollowService.retrieveFollowers(oid);
        res.status(HTTP_STATUS.OK).json(followers);
    } catch (error) {
        console.error('Error retrieving followers:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

followRoutes.get("/followers", requireAuth, async(req, res) => {
    try{
        if(!res.locals.user){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }else if(!res.locals.user.id){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else {
            const followers = await FollowService.retrieveFollowers(res.locals.user.id);
            res.status(HTTP_STATUS.OK).json(followers);
        }
    } catch (error) {
        console.error('Error retrieving followers:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

followRoutes.get("/suggested-mutuals", requireAuth, async(req, res) => {
    try{
        if(!res.locals.user){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        }else if(!res.locals.user.id){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
        } else {
            const suggestedMutuals = await FollowService.retrieveSuggestedMutuals(res.locals.user.id);
            res.status(HTTP_STATUS.OK).json(suggestedMutuals);
        }
    } catch (error) {
        console.error('Error retrieving suggested mutuals:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

export default followRoutes;