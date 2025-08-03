import { config } from "@config/index.ts";
import { retrieveDb } from "@db/index.ts";
import { registerModels, type IUser } from "@models/index.ts";
import type { ICreateUserData } from "types/user.ts";


const db = await retrieveDb(config.dbName);         
const {User: UserModel} = registerModels(db); 

const getUserByGoogleId = async (googleId: string): Promise<IUser | null> => {
    return await UserModel.findOne({ googleId });
}

const getUserByUsername = async (username: string, domain?: string): Promise<IUser | null> => {
    // For ActivityPub, we need to check username + domain combination
    const targetDomain = domain || config.domain;
    return await UserModel.findOne({ username, domain: targetDomain });
}

const createUser = async (userData: ICreateUserData): Promise<IUser> => {
    const protocol = config.domain.includes('localhost') ? 'http' : 'https';
    const baseURL = `${protocol}://${config.domain}`;
    return await UserModel.create({ 
        googleId: userData.googleId,
        username: userData.username,
        domain: config.domain,
        actorId: `${baseURL}/users/${userData.username}`,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl ?? '', 
        inboxUrl: `${baseURL}/users/${userData.username}/inbox`,
        outboxUrl: `${baseURL}/users/${userData.username}/outbox`,
        followersUrl: `${baseURL}/users/${userData.username}/followers`,
        followingUrl: `${baseURL}/users/${userData.username}/following`,
        isLocal: true,
        createdAt: new Date().toISOString()
    });
}

const validateUsername = (username: string): { valid: boolean; error?: string } => {
    
    if (!username || username.length < 1) {
      return { valid: false, error: 'Username is required' };
    }
    
    if (username.length > 30) {
      return { valid: false, error: 'Username must be 30 characters or less' };
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
    }

    return { valid: true };
}

const isUsernameAvailable = async (username: string): Promise<boolean> => {
    const targetDomain =  config.domain;
    const existing = await UserModel.findOne({ username, domain: targetDomain });
    console.log('Checking username availability:', { username, domain: targetDomain, existing });
    return !existing;
}

const updateUser = async (id: string, updates: Partial<IUser>): Promise<IUser | null> => {
    return await UserModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );
}

const searchUsers = (query: string, domain?: string) => {
  const searchCriteria: any = {
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { displayName: { $regex: query, $options: 'i' } }
    ]
  };
  
  if (domain) {
    searchCriteria.domain = domain;
  }
  
  return UserModel.find(searchCriteria).limit(20).lean();
}

export const UserService = {
    getUserByGoogleId,
    getUserByUsername,
    validateUsername,
    isUsernameAvailable,
    createUser,
    updateUser,
    searchUsers
}


