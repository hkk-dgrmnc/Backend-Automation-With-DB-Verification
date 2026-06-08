// TEMPLATE FILE — Copy and rename for your domain (e.g. kampanyaQueries.ts, musteriKartiQueries.ts)
// Each constant holds a single SQL statement as a plain string.
// Queries are called only from repository files, never from tests.

export const EXAMPLE_QUERIES = {

  // Use for GET verification: fetch a single record by its primary key
  GET_BY_ID: `
    SELECT *
    FROM example_table
    WHERE id = $1
  `,

  // Use for GET verification: fetch a list with basic filters
  GET_BY_FILTER: `
    SELECT *
    FROM example_table
    WHERE status = $1
    ORDER BY created_at DESC
  `,

  // Use for POST verification: confirm a newly created record exists
  FIND_BY_UNIQUE_FIELD: `
    SELECT id, name, status, created_at
    FROM example_table
    WHERE name = $1
    LIMIT 1
  `,

  // Use for PUT/PATCH verification: read updated fields after an update API call
  GET_UPDATED_FIELDS: `
    SELECT id, name, status, updated_at
    FROM example_table
    WHERE id = $1
  `,

  // Use for DELETE verification: check if a record is gone or marked inactive
  CHECK_EXISTS: `
    SELECT id, status
    FROM example_table
    WHERE id = $1
  `,

};
