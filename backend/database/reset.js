// Recria o banco do zero e carrega os dados de exemplo.
// Uso (dentro de backend/): npm run db:reset
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/db.js';
import { seed } from './seed.js';

try {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('Tabelas criadas.');
  await seed();
  console.log('Seed carregado.');
} catch (err) {
  console.error('Falha ao recriar o banco:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
