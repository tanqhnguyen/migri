import { Pool } from 'pg';

export function getPool(args: {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
}): Pool {
  return new Pool({
    user: args.username,
    database: args.database,
    password: args.password,
    port: args.port,
    host: args.host,
  });
}
