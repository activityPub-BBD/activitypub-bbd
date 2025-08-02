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
};

export {config};