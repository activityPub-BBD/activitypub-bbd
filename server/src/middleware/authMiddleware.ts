import { Request, Response, NextFunction } from 'express';
import { verifyGoogleJwt } from '../services/authService';
import { HTTP_STATUS } from '../utils/httpStatus';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'No token provided' });
  }

  try {
    const payload = await verifyGoogleJwt(token);
    req.user = payload;
    next();

  } catch (err) {
    console.error('Error verifying Google token:', err);
    res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Invalid token' });
  }
}