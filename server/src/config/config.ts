import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  dbUrl: string;
  dbName: string;
  dbConnectionRetryCount: number;
  baseURL: string
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl: process.env.DB_URL || "mongodb+srv://chirp-admins:Tp8zV7mwJu2qFVrc@chirp-cluster-1.lftjwo3.mongodb.net/",
  dbName: process.env.DB_NAME || "cindi",
  dbConnectionRetryCount: Number(process.env.DB_CONNECTION_RETRY_COUNT) || 5,
  baseURL: process.env.DOMAIN || 'http://localhost:8000'
};

export {config};