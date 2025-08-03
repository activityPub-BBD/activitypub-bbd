import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  dbUrl: string;
  dbName: string;
  domain: string;
  aws: {
    region: string;
    s3MediaBucket: string;
  };
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  neo4j: {
    uri: string;
    user: string;
    password: string;
    auraInstanceId: string;
    auraInstanceName: string;
  };
  redis: {
    host: string;
    port: number;
    username: string;
    password: string;
  }
}

/** PLEASE DO NOT HARD CODE SECRETS FOR THE DEFAULT VALUES */
const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl: process.env.DB_URL || "",
  dbName: process.env.DB_NAME || "",
  domain: process.env.DOMAIN || "",
  aws: {
    region: process.env.AWS_REGION || "af-south-1",
    s3MediaBucket:
      process.env.S3_MEDIA_BUCKET || "group-5-mastodon-media-bucket",
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "",
  neo4j: {
    uri: process.env.NEO4J_URI || "neo4j://localhost:7687",
    user: process.env.NEO4J_USERNAME || "neo4j",
    password: process.env.NEO4J_PASSWORD || "neo4j",
    auraInstanceId: process.env.AURA_INSTANCE_ID || "neo4j",
    auraInstanceName: process.env.AURA_INSTANCE_NAME || "neo4j",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USERNAME || "",
    password: process.env.REDIS_PASSWORD || "",
  },
};

export {config};