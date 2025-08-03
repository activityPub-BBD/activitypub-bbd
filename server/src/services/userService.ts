import { config } from "@config/index.ts";
import { retrieveDb, retrieveNeo4jDriver } from "@db/index.ts";
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

const getUserByActorId = async (actorId: string): Promise<IUser | null> => {
    return await UserModel.findOne({ actorId });
}

const createUser = async (userData: ICreateUserData): Promise<IUser> => {
    const protocol = config.domain.includes('localhost') ? 'http' : 'https';
    const baseURL = `${protocol}://${config.domain}`;
    
    // Use findOneAndUpdate with upsert to handle duplicate googleId gracefully
    const updateData: any = {
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
    };
    
    // Only add googleId if it's provided
    if (userData.googleId) {
        updateData.googleId = userData.googleId;
    }
    
    const query = userData.googleId ? { googleId: userData.googleId } : { username: userData.username, domain: config.domain };
    
    return await UserModel.findOneAndUpdate(
        query,
        updateData,
        { 
            upsert: true, 
            new: true, 
            setDefaultsOnInsert: true 
        }
    );
}

const createRemoteUser = async (actorData: {
    actorId: string;
    username: string;
    domain: string;
    displayName: string;
    inboxUrl: string;
    outboxUrl: string;
    followersUrl: string;
    followingUrl: string;
    bio?: string;
    avatarUrl?: string;
}): Promise<IUser> => {
    return await UserModel.create({
        // googleId is not set for remote users
        username: actorData.username,
        domain: actorData.domain,
        actorId: actorData.actorId,
        displayName: actorData.displayName,
        bio: actorData.bio || '',
        avatarUrl: actorData.avatarUrl || '',
        inboxUrl: actorData.inboxUrl,
        outboxUrl: actorData.outboxUrl,
        followersUrl: actorData.followersUrl,
        followingUrl: actorData.followingUrl,
        isLocal: false,
        createdAt: new Date(),
        followers: [],
        following: []
    });
}

const addFollower = async (userId: string, followerId: string): Promise<IUser | null> => {
    return await UserModel.findByIdAndUpdate(
        userId,
        { $addToSet: { followers: followerId } },
        { new: true }
    );
}

const addFollowing = async (userId: string, followingId: string): Promise<IUser | null> => {
    return await UserModel.findByIdAndUpdate(
        userId,
        { $addToSet: { following: followingId } },
        { new: true }
    );
}

const removeFollower = async (userId: string, followerId: string): Promise<IUser | null> => {
    return await UserModel.findByIdAndUpdate(
        userId,
        { $pull: { followers: followerId } },
        { new: true }
    );
}

const removeFollowing = async (userId: string, followingId: string): Promise<IUser | null> => {
    return await UserModel.findByIdAndUpdate(
        userId,
        { $pull: { following: followingId } },
        { new: true }
    );
}

const getFollowers = async (userId: string): Promise<IUser[]> => {
    const user = await UserModel.findById(userId).populate('followers');
    return (user?.followers as unknown as IUser[]) || [];
}

const getFollowing = async (userId: string): Promise<IUser[]> => {
    const user = await UserModel.findById(userId).populate('following');
    return (user?.following as unknown as IUser[]) || [];
}

const addUserToGraphDb = async(user: IUser): Promise<boolean> => {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
    CREATE (p:Person {
      _id: $id,
      actorId: $name,
      createdAt: $createdAt
      domain: $email,
    })
    RETURN p
    `, { 
    id: user._id,
    name: user.actorId,
    createdAt: user.createdAt,
    email: user.domain
  });

  return result.records.length > 0;
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
    getUserByActorId,
    validateUsername,
    isUsernameAvailable,
    createUser,
    createRemoteUser,
    updateUser,
    searchUsers,
    addFollower,
    addFollowing,
    removeFollower,
    removeFollowing,
    getFollowers,
    getFollowing
    addUserToGraphDb
}


