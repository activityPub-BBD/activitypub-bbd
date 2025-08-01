import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  dbUrl: string;
  dbName: string;
  dbConnectionRetryCount: number;
  domain: string;
  aws: {
    region: string;
    s3MediaBucket: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl: process.env.DB_URL || "mongodb+srv://chirp-admins:Tp8zV7mwJu2qFVrc@chirp-cluster-1.lftjwo3.mongodb.net/",
  dbName: process.env.DB_NAME || "cindi",
  dbConnectionRetryCount: Number(process.env.DB_CONNECTION_RETRY_COUNT) || 5,
  domain: process.env.DOMAIN || "localhost:8000",
  aws: {
    region: process.env.AWS_REGION || "af-south-1",
    s3MediaBucket:
      process.env.S3_MEDIA_BUCKET || "group-5-mastodon-media-bucket",
  },
};

export {config};