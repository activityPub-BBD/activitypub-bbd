import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { Request, Response } from 'express';
import { HTTP_STATUS } from "../utils/httpStatus.ts";
import { retrieveDb } from '@db/db.ts';
import { config } from '@config/config.ts';
import type { IGoogleIdTokenPayload } from 'types/auth.ts';
import { UserService } from './userService.ts';


const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
        
function generateUniqueUsername(firstName: string, lastName: string) {
  const base = (firstName + lastName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  let username = base;
  let suffix = 0;
  //TODO: Check db for username then add numbers for uniqueness
  // while (await isUsernameTaken(username)) {
  //   suffix++;
  //   const trimmedBase = base.slice(0, 15 - suffix.toString().length); // keep total ≤ 15
  //   username = `${trimmedBase}${suffix}`;
  // }
  return username;
}

export async function verifyGoogleJwt(jwt: string): Promise<IGoogleIdTokenPayload> {
  try {
    // verify jwt's signature and validate claims
    const { payload } = await jwtVerify<IGoogleIdTokenPayload>(jwt, JWKS, {
      issuer: 'https://accounts.google.com',
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return payload;

  } catch (err) {
    console.error('Error verifying Google ID token:', err);
    throw new Error('Google token verification failed');
  }
}

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
    const { sub, given_name='', family_name='', picture=''  } = payload;
    const username = generateUniqueUsername(given_name, family_name);
    
    if (!sub) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: "Invalid JWT: missing user ID" 
      });
    }

    let existingUser = null;

    try {  
      existingUser =  await UserService.getUserByGoogleId(sub);      
      // If user doesn't exist, try to create them (but don't block if it fails)
      if (!existingUser) {
        try {
          existingUser = await UserService.createUser({
            googleId: sub,
            username,
            displayName: `${given_name} ${family_name}`,
            avatarUrl: picture ?? ''
          })
        } catch (createError) {
          res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: `User creation failed`,
          });
          console.error('Failed to create user:', createError);
          return
        }
      }

    } catch (dbError) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: `Database operation failed`,
      });
      console.error('Database operation failed:', dbError);
      return
    }

    res.status(HTTP_STATUS.OK).json({ 
      jwt,
      userExists: !!existingUser,
      user: existingUser ? {
        id: existingUser._id,
        displayName: existingUser.displayName,
        avatarUrl: existingUser.avatarUrl,
        userName: existingUser.username
      } : null
    });

  } catch (err) {
    console.error("Google OAuth failed:", err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: `Google OAuth failed: ${err}`,
    });
  }
}

export async function updateUsername(req: Request, res: Response) {
  try {
    const { newUsername } = req.body;

    if (!newUsername) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: "New username required" 
      });
    }

    // Validate username format (optional - add your own rules)
    if (newUsername.length < 3 || newUsername.length > 50) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: "Username must be between 3 and 50 characters" 
      });
    }
  

     // Check if username is already taken
    const isAvailableUserName = await UserService.isUsernameAvailable(newUsername.toLowerCase());
    
    
    if (!isAvailableUserName) {
      return res.status(HTTP_STATUS.CONFLICT).json({ 
        error: "Username already taken" 
      });
    }

    // Find user first to verify they exist
    const existingUser = await UserService.getUserByGoogleId(req.user!.googleId);

    if (!existingUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        error: "User not found" 
      });
    }

    // Update the user
    await UserService.updateUser(
      existingUser.id,
      { username: newUsername.toLowerCase() }
    );

    // Return the updated data
    res.status(HTTP_STATUS.OK).json({ 
      message: "Username setup completed",
      user: {
        id: existingUser._id,
        username: newUsername.toLowerCase()
      }
    });

  } catch (err) {
    console.error("Username setup failed:", err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: `Username setup failed: ${err}`,
    });
  }
}
