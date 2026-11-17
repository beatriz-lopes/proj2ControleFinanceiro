// Recreates the database from scratch and loads the sample data.
// Usage (inside backend/): npm run db:reset
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/db.js';
import { seed } from './seed.js';

try {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('Tables created.');
  await seed();
  console.log('Seed loaded.');
} catch (err) {
  console.error('Failed to reset the database:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
