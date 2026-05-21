import { query } from '../dbClient';
import { exampleQueries } from '../queries/exampleQueries';

export async function findExampleById(id: number | string) {
  const rows = await query(exampleQueries.findById, [id]);
  return rows[0] ?? null;
}

export async function findActiveExampleById(id: number | string) {
  const rows = await query(exampleQueries.findActiveById, [id]);
  return rows[0] ?? null;
}
