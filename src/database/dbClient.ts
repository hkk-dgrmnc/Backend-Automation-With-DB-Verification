import { Pool } from 'pg';
import { dbConfig } from '../config/dbConfig';
import { logDbQuery, logDbResult, logError } from '../utils/logger';

const pool = new Pool(dbConfig);

export async function query(text: string, params: unknown[] = []) {
  const startTime = Date.now();

  logDbQuery(text, params);

  try {
    const result = await pool.query(text, params);
    logDbResult(result.rows, Date.now() - startTime);
    return result.rows;
  } catch (error) {
    logError('DATABASE QUERY FAILED', error);
    throw error;
  }
}

export async function closeDbPool() {
  await pool.end();
}
