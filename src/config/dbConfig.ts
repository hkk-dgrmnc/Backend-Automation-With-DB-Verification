import type { PoolConfig } from 'pg';
import { getBooleanEnv, getNumberEnv, getStringEnv } from './configReader';

const useSsl = getBooleanEnv('DB_SSL', false);

export const dbConfig: PoolConfig = {
  host: getStringEnv('DB_HOST'),
  port: getNumberEnv('DB_PORT', undefined, 1),
  database: getStringEnv('DB_NAME'),
  user: getStringEnv('DB_USER'),
  password: getStringEnv('DB_PASSWORD'),
  max: getNumberEnv('DB_POOL_MAX', undefined, 1),
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
};
