import type { Connection, Model } from "mongoose";
import { postSchema, type IPost } from "./post.ts";
import { userSchema, type IUser } from "./user.ts";
import { followSchema, type IFollow } from "./follow.ts";
import { keySchema, type IKeyPair } from "./keys.ts";

export type { IUser, IPost };

export function registerModels(conn: Connection): {
  User: Model<IUser>;
  Post: Model<IPost>;
  Follow: Model<IFollow>;
  KeyPair: Model<IKeyPair>;
} {

  const User = conn.model<IUser>("User", userSchema);
  const Post = conn.model<IPost>("Post", postSchema);
  const Follow = conn.model<IFollow>("Follow", followSchema);
  const KeyPair = conn.model<IKeyPair>("KeyPair", keySchema);

  return { User, Post, Follow, KeyPair };
}


