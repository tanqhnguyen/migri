import { config as setupConfig } from 'dotenv';

setupConfig();

export type ConfigType = {
  postgres: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
  };
  arango: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
  };
};

export const config: ConfigType = {
  postgres: {
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  },
  arango: {
    host: process.env.ARANGO_HOST || 'localhost',
    port: parseInt(process.env.ARANGO_PORT, 10) || 8529,
    username: process.env.ARANGO_USERNAME,
    password: process.env.ARANGO_PASSWORD,
    database: process.env.ARANGO_DATABASE,
  },
};
