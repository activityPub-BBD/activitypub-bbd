import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  dbUrl: string;
  dbName: string;
  dbConnectionRetryCount: number;
}

function getDbName(): string {
  const environment = process.env.NODE_ENV || 'development';
 
  switch (environment) {
    case 'production':
      return process.env.PROD_DB_NAME || 'prod';
    case 'development':
    default:
      return process.env.DEV_DB_NAME || 'nomcebo';
  }
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbUrl: process.env.MONGODB_URI || '',
  dbName: getDbName(),
  dbConnectionRetryCount: Number(process.env.DB_CONNECTION_RETRY_COUNT) || 5
};

export {config};