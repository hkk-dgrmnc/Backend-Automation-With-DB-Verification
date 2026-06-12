import { Pool } from 'pg';
import { dbConfig } from '../config/dbConfig';
import * as logger from '../utils/logger';

// Pool ilk query'de olusturulur; database verification kullanmayan testler pg'ye dokunmaz.
let pool: Pool | undefined;

function getPool() {
  return (pool ??= new Pool(dbConfig));
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
  if (!pool) {
    return;
  }

  const activePool = pool;
  pool = undefined;
  await activePool.end();
}
