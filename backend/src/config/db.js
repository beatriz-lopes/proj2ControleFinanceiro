import pg from 'pg';

// NUMERIC (1700) comes as a string by default; convert it to a number in the JSON response.
// Money math should be done in the database (SUM) or in integer cents.
pg.types.setTypeParser(1700, (v) => parseFloat(v));
// DATE (1082) stays as a 'YYYY-MM-DD' string to avoid timezone shifts.
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Simple parameterized query: query('SELECT ... WHERE id = $1', [id])
export function query(text, params) {
  return pool.query(text, params);
}

// Runs fn(client) inside a transaction. Any error triggers ROLLBACK.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
