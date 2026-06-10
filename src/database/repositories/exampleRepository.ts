// TEMPLATE FILE — Copy and rename for your domain (e.g. kampanyaRepository.ts, musteriKartiRepository.ts)
// Repositories provide domain-specific database access methods.
// Rules:
//   - Always call query() from dbClient, never create a direct connection
//   - Always use SQL constants from the matching queries file
//   - Return plain rows or simple objects — no API calls, no assertions here

import { query } from '../dbClient';
import { EXAMPLE_QUERIES } from '../queries/exampleQueries';

// Use in GET tests: fetch expected data before calling the API, then compare
export async function getExampleById(id: number) {
  const rows = await query(EXAMPLE_QUERIES.GET_BY_ID, [id]);
  return rows[0] ?? null;
}

// Use in GET tests: fetch a filtered list to compare against a paginated API response
export async function getExamplesByStatus(status: string) {
  return query(EXAMPLE_QUERIES.GET_BY_FILTER, [status]);
}

// Use in POST tests: after API creates a record, verify it exists in the DB
export async function findExampleByName(name: string) {
  const rows = await query(EXAMPLE_QUERIES.FIND_BY_UNIQUE_FIELD, [name]);
  return rows[0] ?? null;
}

// Use in PUT/PATCH tests: after API updates a record, verify updated fields in DB
export async function getUpdatedFields(id: number) {
  const rows = await query(EXAMPLE_QUERIES.GET_UPDATED_FIELDS, [id]);
  return rows[0] ?? null;
}

// Use in DELETE tests: after API deletes/deactivates a record, verify DB state
export async function checkExists(id: number) {
  const rows = await query(EXAMPLE_QUERIES.CHECK_EXISTS, [id]);
  return rows[0] ?? null;
}
