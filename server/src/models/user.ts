import { Document, Model, Schema, Types } from 'mongoose';
import mongoose from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId: string;
  domain: string; //example.com
  actorId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  inboxUrl: string;
  outboxUrl: string;
  followersUrl: string;
  followingUrl: string;
  isLocal: boolean;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  actorId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: ''
  },
  avatarUrl: {
    type: String
  },
  inboxUrl: {
    type: String,
    required: true
  },
  outboxUrl: {
    type: String,
    required: true
  },
  followersUrl: {
    type: String,
    required: true
  },
  followingUrl: {
    type: String,
    required: true
  },
  isLocal: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    required: true
  }
});

export const User = mongoose.model<IUser>('User', userSchema);

export function getUserModel(conn: mongoose.Connection): Model<IUser> {
  return conn.model<IUser>("User", userSchema);
}
// export async function getUserModel() {
//   if (!userModel) {
//     const db = await retrieveDb(config.dbName);
//     userModel = db.model<IUser>('User', userSchema, 'users');
//   }
//   return userModel;
// }

// export const User = {
//   async findOne(query: any) {
//     const UserModel = await getUserModel();
//     return UserModel.findOne(query);
//   },
//   async find(query: any = {}) {
//     const UserModel = await getUserModel();
//     return UserModel.find(query);
//   },
//   async create(userData: {
//     google_sub: string;
//   }) {
//     const UserModel = await getUserModel();
//     const user = new UserModel(userData);
//     return user.save();
//   },
//   async findOneAndUpdate(query: any, update: any, options: any = {}) {
//     const UserModel = await getUserModel();
//     return UserModel.findOneAndUpdate(query, update, options);
//   }

// };