
import { query } from '../config/db.js';

export async function findAll(userId) {
  const { rows } = await query(
    `
    SELECT *
     FROM categories
     WHERE user_id = $1
     ORDER BY type, name
     `,
    [userId]
  );

  return rows;
}

export async function findById(id, userId) {
  const { rows } = await query(
    `
    SELECT *
     FROM categories
     WHERE id = $1 AND user_id = $2
     `,
    [id, userId]
  );

  return rows[0] ?? null;
}

export async function create({ userId, name, type }) {
  const { rows } = await query(
    `
    INSERT INTO categories (user_id, name, type)
     VALUES ($1, $2, $3)
     RETURNING *
     `,
    [userId, name, type]
  );

  return rows[0];
}

export async function update(id, userId, { name, type }) {
  const { rows } = await query(
    `
    UPDATE categories
     SET name = $1, type = $2
     WHERE id = $3 AND user_id = $4
     RETURNING *
     `,
    [name, type, id, userId]
  );

  return rows[0] ?? null;
}

export async function remove(id, userId) {
  const { rows } = await query(
    `
    DELETE FROM categories
     WHERE id = $1 AND user_id = $2
     RETURNING *
     `,
    [id, userId]
  );

  return rows[0] ?? null;
}
