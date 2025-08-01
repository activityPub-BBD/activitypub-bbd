import { Router } from "express";
import { getGoogleJwt, updateUsername} from "../services/authService.ts";
import { requireAuth } from "@middleware/auth.ts";
import { HTTP_STATUS } from "@utils/httpStatus.ts";

export const authRoutes = Router();


/**
 * @route POST /api/auth/google
 * @description Sign in with Google and get JWT
*/
authRoutes.post('/google', getGoogleJwt); 

/**
 * @route POST /api/auth/logout
 * @description Logs the user out (frontend should delete token)
 */
authRoutes.post('/logout', requireAuth,   async (req, res) => {
  res.status(HTTP_STATUS.OK).json({ message: 'Logged out successfully' });
});

/**
 * @route GET /api/auth/me
 * @description Get current authenticated user's profile
*/
authRoutes.get('/me', requireAuth, async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Not authenticated' });
    }

    res.status(HTTP_STATUS.OK).json({
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        joinDate: user.createdAt,
        activityPubId: user.actorId,
    });
});


export default authRoutes;