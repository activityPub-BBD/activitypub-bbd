import { Request, Response } from 'express';
import { verifyGoogleJwt } from "../services/authService.ts";
import { User } from "../models/user.ts";
import { HTTP_STATUS } from "../utils/httpStatus.ts";

export async function getGoogleJwt(req: Request, res: Response) {
	try {
    let { code } = req.body;

    // Decode URL-encoded code
    code = decodeURIComponent(code);

    const params = new URLSearchParams({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: "Invalid auth code", 
        details: errorText 
      });
    }

    const { id_token: jwt } = await response.json();
    const payload = await verifyGoogleJwt(jwt);
    const { sub } = payload;

    if (!sub) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: "Invalid JWT: missing user ID" 
      });
    }

    let existingUser = null;

    try {
      const dbPromise = User.findOne({ google_sub: sub });
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 3000);
      });

      existingUser = await Promise.race([dbPromise, timeoutPromise]);

      // If user doesn't exist, try to create them (but don't block if it fails)
      if (!existingUser) {
        try {
          existingUser = await User.create({ google_sub: sub });
        } catch (createError) {
          // Continue even if creation fails
          console.error('Failed to create user:', createError);
        }
      }

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      User.create({ google_sub: sub }).catch(() => {
      });
    }

    res.status(HTTP_STATUS.OK).json({ 
      jwt,
      userExists: !!existingUser,
      needsUsername: !existingUser,
      user: existingUser ? {
        id: existingUser._id
      } : null
    });
	} catch (err) {
		console.error("Google OAuth failed:", err);
		res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
			error: `Google OAuth failed: ${err}`,
		});
	}
}