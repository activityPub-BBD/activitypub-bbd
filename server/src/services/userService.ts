import { config } from "@config/index";
import { retrieveDb, retrieveNeo4jDriver } from "@db/index";
import { registerModels, type IUser } from "@models/index";
import type { ICreateUserData } from "types/user";


const db = await retrieveDb(config.dbName);         
const {User: UserModel} = registerModels(db); 

const getUserByGoogleId = async (googleId: string): Promise<IUser | null> => {
    return await UserModel.findOne({ googleId });
}

const getUserByObjectId = async (userId: string): Promise<IUser | null> => {
    return await UserModel.findById(userId);
}

const getUserByUsername = async (username: string): Promise<IUser | null> => {
  return await UserModel.findOne({ username });
}

const getUserByUsernameAndDomain = async (username: string, domain?: string): Promise<IUser | null> => {
  // For ActivityPub, we need to check username + domain combination
  const targetDomain = domain || config.domain;
    return await UserModel.findOne({ username, domain });
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
    });
}

const addUserToGraphDb = async(user: IUser): Promise<boolean> => {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
    CREATE (p:Person {
      _id: $id,
      actorId: $actorId,
      createdAt: $createdAt,
      inboxUrl: $inboxUrl
    })
    RETURN p
    `, { 
    id: user._id.toString(),
    actorId: user.actorId,
    createdAt: user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : user.createdAt,
    inboxUrl: user.inboxUrl
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
      { $set: updates },
      { new: true, upsert: true, }
    );
}

const searchUsers = (query: string, domain?: string) => {
  const searchCriteria: any = {
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { displayName: { $regex: query, $options: 'i' } }
    ]
  };
  
  return UserModel.find(searchCriteria).limit(20).lean();
}

const getFirstUsers = (limit: number, domain?: string) => {
  const searchCriteria: any = {};
  
  return UserModel.find(searchCriteria).limit(limit).lean();
}

export const UserService = {
    getUserByGoogleId,
    getUserByUsername,
    getUserByActorId,
    getUserByObjectId,
    validateUsername,
    isUsernameAvailable,
    createUser,
    createRemoteUser,
    updateUser,
    searchUsers,
    getFirstUsers,
    addUserToGraphDb,
    getUserByUsernameAndDomain
}


