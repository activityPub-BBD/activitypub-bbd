import mongoose, { Document, Schema } from 'mongoose';
import { config } from '@config/index';
import { retrieveDb } from '@db/db';

export interface IUser extends Document {
  google_sub: string;
}

const userSchema = new Schema<IUser>({
  google_sub: { type: String, required: true, unique: true }}, 
 { collection: 'users'}
);


let userModel: mongoose.Model<IUser> | null = null;

export async function getUserModel() {
  if (!userModel) {
    const db = await retrieveDb(config.dbName);
    userModel = db.model<IUser>('User', userSchema, 'users');
  }
  return userModel;
}

export const User = {
  async findOne(query: any) {
    const UserModel = await getUserModel();
    return UserModel.findOne(query);
  },
  async find(query: any = {}) {
    const UserModel = await getUserModel();
    return UserModel.find(query);
  },
  async create(userData: {
    google_sub: string;
  }) {
    const UserModel = await getUserModel();
    const user = new UserModel(userData);
    return user.save();
  }
};