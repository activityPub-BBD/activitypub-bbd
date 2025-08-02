import { config } from "@config/index.ts";
import { retrieveDb } from "@db/index.ts";
import { registerModels, type IUser } from "@models/index.ts";
import type { ICreateUserData } from "types/user.ts";


const db = await retrieveDb(config.dbName);         
const {User: UserModel} = registerModels(db); 

const getUserByGoogleId = async (googleId: string): Promise<IUser | null> => {
    return await UserModel.findOne({ googleId });
}

const getUserByUsername = async (username: string): Promise<IUser | null> => {
    return await UserModel.findOne({ username });
}

const getUserByActivityPubUri = async (actorId: string): Promise<IUser | null> => {
    return await UserModel.findOne({ actorId});
}

const createUser = async (userData: ICreateUserData): Promise<IUser> => {
    const protocol = config.domain.includes('localhost') ? 'http' : 'https';
    const baseURL = `${protocol}://${config.domain}`;
    return await UserModel.create({ 
        googleId: userData.googleId,
        username: userData.username,
        domain: config.domain,
        actorId: `${baseURL}/users/${userData.username}`,
        handle: `@${userData.username}@${config.domain}`,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl ?? '', 
        inboxUrl: `${baseURL}/users/${userData.username}/inbox`,
        outboxUrl: `${baseURL}/users/${userData.username}/outbox`,
        followersUrl: `${baseURL}/users/${userData.username}/followers`,
        followingUrl: `${baseURL}/users/${userData.username}/following`,
        isLocal: true,
        createdAt: Date.now
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
    const existing = await UserModel.findOne({ username, isLocal: true });
    console.log(existing)
    return !existing;
}

const updateUser = async (id: string, updates: Partial<IUser>): Promise<IUser | null> => {
    return await UserModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );
}

const deleteUserByActivityPubUri = async (actorId: string): Promise<boolean> => {
    const user = await UserModel.findOne({ actorId: actorId });
    if (!user) {
      return false;
    }
    await UserModel.deleteOne({ actorId: actorId });
    return true;
}

const searchUsers = (query: string) => {
  return UserModel.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { displayName: { $regex: query, $options: 'i' } }
    ]
  }).limit(20).lean();
}

export const UserService = {
    getUserByGoogleId,
    getUserByUsername,
    getUserByActivityPubUri,
    validateUsername,
    isUsernameAvailable,
    createUser,
    updateUser,
    deleteUserByActivityPubUri,
    searchUsers
}


