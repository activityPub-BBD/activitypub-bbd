import mongoose from "mongoose";
import { config } from "@config/index";
import { Mutex } from "@utils/index";

const mongo = mongoose.createConnection(config.dbUrl);
const isConnectedMutex = new Mutex(false);

const connectionPromise = new Promise<void>((resolve, reject) => {
  mongo.once("connected", () => {
    console.log("Connected to MongoDB");
    isConnectedMutex.update((isConnected) => {
      isConnected = true;
      return isConnected;
    });
    resolve();
  });

  mongo.once("error", (err) => {
    console.error("Error connecting to MongoDB:", err);
    reject(err);
  });
});

mongo.on("connected", () => {
  isConnectedMutex.update((isConnected) => {
    isConnected = true;
    return isConnected;
  });
});

mongo.on("disconnected", () => {
  isConnectedMutex.update((isConnected) => {
    isConnected = false;
    return isConnected;
  });
});

export async function connectToMongo() {
  await isConnectedMutex.with(async (isConnected) => {
    if (!isConnected) {
      await connectionPromise;
    }
  });
}

export async function retrieveDb(dbName: string): Promise<mongoose.Connection> {
  await connectToMongo();
  return mongo.useDb(dbName);
}

export async function retrieveCollection(
  dbName: string,
  collectionName: string
): Promise<mongoose.Collection<mongoose.AnyObject>> {
  const db = await retrieveDb(dbName);
  return db.collection(collectionName);
}

export async function disconnectFromMongo(): Promise<void> {
  await isConnectedMutex.update(async (isConnected) => {
    await mongo.close();
    isConnected = false;
    return isConnected;
  });
}