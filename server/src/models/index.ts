import type { Connection, Model } from "mongoose";
import { postSchema, type IPost } from "./post.ts";
import { userSchema, type IUser } from "./user.ts";

export * from "./post.ts";
export * from "./user.ts";

export function registerModels(conn: Connection): {
  User: Model<IUser>;
  Post: Model<IPost>;
} {
  const User = conn.model<IUser>("User", userSchema);
  const Post = conn.model<IPost>("Post", postSchema);
  return { User, Post };
}