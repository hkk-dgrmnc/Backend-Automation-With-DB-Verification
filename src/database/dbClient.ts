import { Pool } from 'pg';
import { dbConfig, validateDbConfig } from '../config/dbConfig';
import * as logger from '../utils/logger';

// Pool ilk query'de olusturulur; database verification kullanmayan testler pg'ye dokunmaz.
let pool: Pool | undefined;
let poolClosed = false;

function getPool() {
  if (poolClosed) {
    throw new Error('Database pool kapatıldı. closeDbPool sonrası yeni query çalıştırılamaz.');
  }

  if (!pool) {
    validateDbConfig();
    pool = new Pool(dbConfig);

    // Bosta bekleyen baglantida olusan hata (DB restart, ag kopmasi) listener
    // olmadan Node process'ini, yani Playwright worker'ini cokertir.
    pool.on('error', (error) => {
      logger.logError('DATABASE POOL IDLE CLIENT ERROR', error);
    });
  }

  return pool;
}

export async function query(text: string, params: unknown[] = []) {
  const startTime = Date.now();

  logger.logDbQuery(text, params);

  try {
    const result = await getPool().query(text, params);
    logger.logDbResult(result.rows, Date.now() - startTime);
    return result.rows;
  } catch (error) {
    logger.logError('DATABASE QUERY FAILED', error);
    throw error;
  }
}

export async function closeDbPool() {
  poolClosed = true;

  if (!pool) {
    return;
  }

  const activePool = pool;
  pool = undefined;
  await activePool.end();
}
