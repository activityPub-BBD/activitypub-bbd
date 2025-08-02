import type { Types } from "mongoose";

export interface IKeyPair {
  userId: Types.ObjectId;
  type: "RSASSA-PKCS1-v1_5" | "Ed25519";
  privateKey: string;
  publicKey: string;
  createdAt: Date;
}