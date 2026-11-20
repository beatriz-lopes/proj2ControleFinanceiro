
import { query, withTransaction } from '../config/db.js';

export async function findAll(userId) {
  const { rows } = await query(
    `
    SELECT
      id,
      user_id,
      name,
      type,
      closing_day,
      due_day,
      credit_limit,
      emergency_reserve
    FROM accounts
    WHERE user_id = $1
    ORDER BY name
    `,
    [userId]
  );

  return rows;
}

export async function findById(id, userId) {
  const { rows } = await query(
    `
    SELECT *
    FROM accounts
    WHERE id = $1 AND user_id = $2
    `,
    [id, userId]
  );

  return rows[0] ?? null;
}

export async function create(data) {
  const { rows } = await query(
    `
    INSERT INTO accounts (
      user_id,
      name,
      type,
      closing_day,
      due_day,
      credit_limit,
      emergency_reserve
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      data.userId,
      data.name,
      data.type,
      data.closingDay,
      data.dueDay,
      data.creditLimit,
      data.emergencyReserve
    ]
  );

  return rows[0];
}

export async function update(id, userId, data) {
  return withTransaction(async (client) => {
    // Bloqueia a conta durante a validação.
    const current = await client.query(
      `
      SELECT id
      FROM accounts
      WHERE id = $1 AND user_id = $2
      FOR UPDATE
      `,
      [id, userId]
    );

    if (!current.rows.length) {
      return null;
    }

    // Verifica se o novo tipo é incompatível com lançamentos existentes.
    const incompatible = await client.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM transactions
        WHERE account_id = $1
          AND user_id = $2
          AND (
            (type = 'income' AND $3 = 'credit_card')
            OR
            (type = 'expense' AND $3 = 'income_source')
          )
      ) AS has_incompatible_transactions
      `,
      [id, userId, data.type]
    );

    if (
      incompatible.rows[0].has_incompatible_transactions
    ) {
      return {
        error: 'incompatible_transactions'
      };
    }

    const { rows } = await client.query(
      `
      UPDATE accounts
      SET
        name = $1,
        type = $2,
        closing_day = $3,
        due_day = $4,
        credit_limit = $5,
        emergency_reserve = $6
      WHERE id = $7 AND user_id = $8
      RETURNING *
      `,
      [
        data.name,
        data.type,
        data.closingDay,
        data.dueDay,
        data.creditLimit,
        data.emergencyReserve,
        id,
        userId
      ]
    );

    return rows[0] ?? null;
  });
}

export async function remove(id, userId) {
  const { rows } = await query(
    `
    DELETE FROM accounts
    WHERE id = $1 AND user_id = $2
    RETURNING id
    `,
    [id, userId]
  );

  return rows[0] ?? null;
}
