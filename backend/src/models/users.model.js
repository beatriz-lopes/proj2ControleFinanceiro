import { query } from '../config/db.js';

// Public columns: password_hash NEVER leaves this module, except in findByEmailWithPassword (login only).
const COLUMNS = 'id, name, email, cpf, created_at';

// Names are shown to the user, so they stay in Portuguese.
const DEFAULT_CATEGORIES = [
  ['Salário', 'income'],
  ['Outros', 'income'],
  ['Alimentação', 'expense'],
  ['Moradia', 'expense'],
  ['Saúde', 'expense'],
  ['Mobilidade', 'expense'],
  ['Lazer', 'expense'],
  ['Educação', 'expense'],
  ['Outros', 'expense'],
];

// db = pool (default) or the client of a transaction
export async function create({ name, email, cpf, passwordHash }, db = { query }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, cpf, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [name, email, cpf, passwordHash],
  );
  return rows[0];
}

// Initial categories and account for every new user.
export async function createDefaults(userId, db = { query }) {
  for (const [name, type] of DEFAULT_CATEGORIES) {
    await db.query('INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3)', [userId, name, type]);
  }
  await db.query(
    "INSERT INTO accounts (user_id, name, type) VALUES ($1, 'Conta corrente', 'bank_account')",
    [userId],
  );
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByEmailWithPassword(email) {
  const { rows } = await query(`SELECT ${COLUMNS}, password_hash FROM users WHERE email = $1`, [email]);
  return rows[0] ?? null;
}
