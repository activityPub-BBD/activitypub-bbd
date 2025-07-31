import type { Request, Response } from 'express';
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
      needsUsername: !existingUser?.username, 
      user: existingUser ? {
        id: existingUser._id,
        username: existingUser.username
      } : null
    });
	} catch (err) {
		console.error("Google OAuth failed:", err);
		res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
			error: `Google OAuth failed: ${err}`,
		});
	}
}

export async function setupUsername(req: Request, res: Response) {
  try {
    const { username, jwt } = req.body;

    if (!username || !jwt) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: "Username and JWT are required" 
      });
    }

    // Validate username format (optional - add your own rules)
    if (username.length < 3 || username.length > 50) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: "Username must be between 3 and 50 characters" 
      });
    }

    // Verify the JWT is valid
    const payload = await verifyGoogleJwt(jwt);
    const { sub } = payload;

    if (!sub) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        error: "Invalid JWT" 
      });
    }

     // Check if username is already taken
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(HTTP_STATUS.CONFLICT).json({ 
        error: "Username already taken" 
      });
    }

    // Find user first to verify they exist
    const existingUser = await User.findOne({ google_sub: sub });

    if (!existingUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        error: "User not found" 
      });
    }

    // Update the user
    await User.findOneAndUpdate(
      { google_sub: sub },
      { username: username.toLowerCase() }
    );

    // Return the updated data
    res.status(HTTP_STATUS.OK).json({ 
      message: "Username setup completed",
      user: {
        id: existingUser._id,
        username: username.toLowerCase()
      }
    });

  } catch (err) {
    console.error("Username setup failed:", err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: `Username setup failed: ${err}`,
    });
  }
}