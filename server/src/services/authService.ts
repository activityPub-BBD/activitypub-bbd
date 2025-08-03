import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { Request, Response } from 'express';
import { HTTP_STATUS } from "@utils/index.ts";
import { config } from '@config/config.ts';
import type { IGoogleIdTokenPayload } from 'types/auth.ts';
import { UserService } from './userService.ts';


const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
        
function generateUsernameFromEmail(email: string): string {
  const username = email.split('@')[0];
  
  // emails come with dots, might cause issues with activitypub, but luckily according to gmaill john.doe@gmail.com and johndoe@gmail.com are the same email
  const cleanUsername = username.toLowerCase().replace(/\./g, '');
  
  return cleanUsername;
}

export async function verifyGoogleJwt(jwt: string): Promise<IGoogleIdTokenPayload> {
  try {
    // verify jwt's signature and validate claims
    const { payload } = await jwtVerify<IGoogleIdTokenPayload>(jwt, JWKS, {
      issuer: 'https://accounts.google.com',
      audience: config.googleClientId
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
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectUri,
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
    const { sub, given_name='', family_name='', picture='', email=''  } = payload;
    const username = generateUsernameFromEmail(email);
    
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
            googleId: sub, // Google ID is provided for local users
            username,
            displayName: `${given_name} ${family_name}`,
            avatarUrl: picture ?? ''
          })

          const addedToGrap = await UserService.addUserToGraphDb(existingUser);

          if (!addedToGrap) {
            throw new Error('User creation failed in graph db');
          }
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
  

     // Check if username is already taken on this domain
    const isAvailableUserName = await UserService.isUsernameAvailable(newUsername.toLowerCase());
    
    
    if (!isAvailableUserName) {
      return res.status(HTTP_STATUS.CONFLICT).json({ 
        error: "Username already taken" 
      });
    }

    // Find user first to verify they exist
    // For local users, we can use googleId, but we should also support other lookup methods
    let existingUser = null;
    if (res.locals.user?.googleId) {
      existingUser = await UserService.getUserByGoogleId(res.locals.user.googleId);
    }
    
    // If not found by googleId, try by username (for cases where googleId might not be set)
    if (!existingUser && res.locals.user?.username) {
      existingUser = await UserService.getUserByUsername(res.locals.user.username);
    }

    if (!existingUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        error: "User not found" 
      });
    }

    // Update the user
    await UserService.updateUser(
      existingUser._id.toString(),
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
