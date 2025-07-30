import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  dbUrl: string;
  dbName: string;
  dbConnectionRetryCount: number;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl: process.env.DB_URL || "",
  dbName: process.env.DB_NAME || "",
  dbConnectionRetryCount: Number(process.env.DB_CONNECTION_RETRY_COUNT) || 5
};

export {config};