import type { Connection, Model } from "mongoose";
import { postSchema, type IPost } from "./post.ts";
import { userSchema, type IUser } from "./user.ts";
import { keySchema, type IKey } from "./key.ts";

export * from "./post.ts";
export * from "./user.ts";
export * from "./key.ts";

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