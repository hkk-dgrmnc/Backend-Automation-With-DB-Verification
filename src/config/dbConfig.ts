import type { PoolConfig } from 'pg';
import { getBooleanEnv, getNumberEnv, getStringEnv } from './configReader';

const useSsl = getBooleanEnv('DB_SSL', false);
const rejectUnauthorized = getBooleanEnv('DB_SSL_REJECT_UNAUTHORIZED', true);

export const dbConfig: PoolConfig = {
  host: getStringEnv('DB_HOST'),
  port: getNumberEnv('DB_PORT', undefined, 1),
  database: getStringEnv('DB_NAME'),
  user: getStringEnv('DB_USER'),
  password: getStringEnv('DB_PASSWORD'),
  max: getNumberEnv('DB_POOL_MAX', undefined, 1),
  connectionTimeoutMillis: getNumberEnv('DB_CONNECT_TIMEOUT_MS', 5000, 1),
  idleTimeoutMillis: getNumberEnv('DB_IDLE_TIMEOUT_MS', 10000, 1),
  query_timeout: getNumberEnv('DB_QUERY_TIMEOUT_MS', 15000, 1),
  ssl: useSsl ? { rejectUnauthorized } : undefined
};

/**
 * Zorunlu database alanlarinin dolu oldugunu dogrular.
 *
 * Import aninda degil, pool ilk olusturulurken cagrilir; boylece database
 * verification kullanmayan API-only testler eksik DB config'inden etkilenmez.
 */
export function validateDbConfig() {
  const requiredFields: Array<[string, unknown]> = [
    ['DB_HOST', dbConfig.host],
    ['DB_NAME', dbConfig.database],
    ['DB_USER', dbConfig.user],
    ['DB_PASSWORD', dbConfig.password]
  ];

  const missingFields = requiredFields.filter(([, value]) => value === undefined).map(([name]) => name);

  if (missingFields.length > 0) {
    throw new Error(
      `Database verification için eksik environment değerleri: ${missingFields.join(', ')}. ` +
        '`.env` dosyasındaki DB_* alanlarını doldurun.'
    );
  }
}
