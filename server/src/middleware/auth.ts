import { HTTP_STATUS } from "@utils/httpStatus.ts";
import type { NextFunction } from "express";
import { verifyGoogleJwt } from "@services/authService.ts";
import { UserService } from '@services/userService.ts';

export async function requireAuth(req: any, res: any, next: NextFunction) {
  
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Authentication required' });
        }

        const token = authHeader.substring(7);
        const payload = await verifyGoogleJwt(token);
        const { sub } = payload;
        
        const user = await UserService.getUserByGoogleId(sub);
        if (!user) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'User not found' });
        }

        res.locals.user = user;
        next();
    } catch (error) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid token' });
    }
}