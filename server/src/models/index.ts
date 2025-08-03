import type { Connection, Model } from "mongoose";
import { postSchema, type IPost } from "./post";
import { userSchema, type IUser } from "./user";
import { keySchema, type IKey } from "./key";

export * from "./post";
export * from "./user";
export * from "./key";

export function registerModels(conn: Connection): {
  User: Model<IUser>;
  Post: Model<IPost>;
  Key: Model<IKey>;
} {
  const User = conn.model<IUser>("User", userSchema);
  const Post = conn.model<IPost>("Post", postSchema);
  const Key = conn.model<IKey>("Key", keySchema);
  return { User, Post, Key };
}