
import { query, withTransaction } from '../config/db.js';

const SELECT_TRANSACTION = `
  SELECT
    t.id,
    t.user_id,
    t.type,
    t.description,
    t.amount,
    t.date,
    t.category_id,
    c.name AS category_name,
    t.account_id,
    a.name AS account_name,
    a.type AS account_type,
    t.installment_number,
    t.installment_count,
    t.installment_group
  FROM transactions t
  INNER JOIN categories c ON c.id = t.category_id
  INNER JOIN accounts a ON a.id = t.account_id
`;

export async function findById(id, userId) {
  const { rows } = await query(
    `${SELECT_TRANSACTION}
     WHERE t.id = $1 AND t.user_id = $2`,
    [id, userId]
  );

  return rows[0] ?? null;
}

// Valida se categoria e fonte/destino pertencem ao usuário
// e se são compatíveis com o tipo do lançamento.
export async function validateRelations(
  client,
  { userId, categoryId, accountId, type }
) {
  const category = await client.query(
    `
    SELECT id, type
    FROM categories
    WHERE id = $1 AND user_id = $2
    FOR SHARE
    `,
    [categoryId, userId]
  );

  if (!category.rows[0]) {
    return { error: 'category' };
  }

  if (category.rows[0].type !== type) {
    return { error: 'category_type' };
  }

  const account = await client.query(
    `
    SELECT id, type
    FROM accounts
    WHERE id = $1 AND user_id = $2
    FOR SHARE
    `,
    [accountId, userId]
  );

  if (!account.rows[0]) {
    return { error: 'account' };
  }

  const accountType = account.rows[0].type;

  // Cartão de crédito não pode ser utilizado em entradas.
  // Fonte exclusiva de renda não pode ser utilizada em saídas.
  if (
    (type === 'income' && accountType === 'credit_card') ||
    (type === 'expense' && accountType === 'income_source')
  ) {
    return { error: 'account_type' };
  }

  return {
    category: category.rows[0],
    account: account.rows[0]
  };
}

// Insere um lançamento ou um grupo de parcelas.
export async function insertGroup(data) {
  return withTransaction(async (client) => {
    const relations = await validateRelations(client, data);

    if (relations.error) {
      return { error: relations.error };
    }

    const created = [];

    for (
      let index = 0;
      index < data.installments.length;
      index++
    ) {
      const installment = data.installments[index];

      const { rows } = await client.query(
        `
        INSERT INTO transactions (
          user_id,
          type,
          description,
          amount,
          date,
          category_id,
          account_id,
          installment_number,
          installment_count,
          installment_group
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
        `,
        [
          data.userId,
          data.type,
          data.description,
          (installment / 100).toFixed(2),
          data.date,
          data.categoryId,
          data.accountId,
          index + 1,
          data.installments.length,
          data.installmentGroup
        ]
      );

      created.push(rows[0]);
    }

    return { data: created };
  });
}

// Busca todas as parcelas de um lançamento.
export async function findGroup(id, userId) {
  const { rows } = await query(
    `
    SELECT *
    FROM transactions
    WHERE user_id = $1
      AND (
        id = $2
        OR installment_group = (
          SELECT installment_group
          FROM transactions
          WHERE id = $2 AND user_id = $1
        )
      )
    ORDER BY installment_number
    `,
    [userId, id]
  );

  return rows;
}

// Atualiza um lançamento ou todo o grupo de parcelas.
export async function updateGroup(id, userId, data) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `
      SELECT *
      FROM transactions
      WHERE user_id = $1
        AND (
          id = $2
          OR installment_group = (
            SELECT installment_group
            FROM transactions
            WHERE id = $2 AND user_id = $1
          )
        )
      FOR UPDATE
      `,
      [userId, id]
    );

    if (!existing.rows.length) {
      return null;
    }

    const relations = await validateRelations(client, data);

    if (relations.error) {
      return { error: relations.error };
    }

    const group = existing.rows[0].installment_group;

    await client.query(
      `
      DELETE FROM transactions
      WHERE user_id = $1
        AND (
          id = $2
          OR ($3::uuid IS NOT NULL AND installment_group = $3)
        )
      `,
      [userId, id, group]
    );

    const created = [];

    for (
      let index = 0;
      index < data.installments.length;
      index++
    ) {
      const { rows } = await client.query(
        `
        INSERT INTO transactions (
          user_id,
          type,
          description,
          amount,
          date,
          category_id,
          account_id,
          installment_number,
          installment_count,
          installment_group
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
        `,
        [
          userId,
          data.type,
          data.description,
          (data.installments[index] / 100).toFixed(2),
          data.date,
          data.categoryId,
          data.accountId,
          index + 1,
          data.installments.length,
          data.installmentGroup
        ]
      );

      created.push(rows[0]);
    }

    return { data: created };
  });
}

// Exclui uma parcela ou todas as parcelas do grupo.
export async function remove(
  id,
  userId,
  allInstallments = false
) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `
      SELECT id, installment_group
      FROM transactions
      WHERE id = $1 AND user_id = $2
      FOR UPDATE
      `,
      [id, userId]
    );

    if (!existing.rows.length) {
      return [];
    }

    const group = existing.rows[0].installment_group;

    const result = allInstallments && group
      ? await client.query(
          `
          DELETE FROM transactions
          WHERE user_id = $1
            AND installment_group = $2
          RETURNING id
          `,
          [userId, group]
        )
      : await client.query(
          `
          DELETE FROM transactions
          WHERE id = $1 AND user_id = $2
          RETURNING id
          `,
          [id, userId]
        );

    return result.rows;
  });
}

// Lista lançamentos com filtros, paginação e resumo financeiro.
export async function findAll(userId, filters) {
  const conditions = ['t.user_id = $1'];
  const params = [userId];

  function addCondition(sql, value) {
    params.push(value);
    conditions.push(
      sql.replace('?', `$${params.length}`)
    );
  }

  addCondition('t.date >= ?::date', filters.start);
  addCondition('t.date <= ?::date', filters.end);

  if (filters.type) {
    addCondition('t.type = ?', filters.type);
  }

  if (filters.categoryId) {
    addCondition('t.category_id = ?', filters.categoryId);
  }

  if (filters.accountId) {
    addCondition('t.account_id = ?', filters.accountId);
  }

  const where = conditions.join(' AND ');

  const summary = await query(
    `
    SELECT
      COALESCE(
        SUM(amount) FILTER (WHERE type = 'income'),
        0
      ) AS income,

      COALESCE(
        SUM(amount) FILTER (WHERE type = 'expense'),
        0
      ) AS expense,

      COALESCE(
        SUM(
          CASE
            WHEN type = 'income' THEN amount
            ELSE -amount
          END
        ),
        0
      ) AS balance,

      COUNT(*) AS total

    FROM transactions t
    WHERE ${where}
    `,
    params
  );

  const pageParams = [...params];

  pageParams.push(filters.limit);
  const limitIndex = pageParams.length;

  pageParams.push(
    (filters.page - 1) * filters.limit
  );

  const offsetIndex = pageParams.length;

  const { rows } = await query(
    `
    ${SELECT_TRANSACTION}
    WHERE ${where}
    ORDER BY t.date DESC, t.id DESC
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
    `,
    pageParams
  );

  return {
    transactions: rows,
    summary: summary.rows[0],
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: Number(summary.rows[0].total),
      totalPages: Math.ceil(
        Number(summary.rows[0].total) / filters.limit
      )
    }
  };
}

// Busca as relações utilizadas na preparação do lançamento.
export async function getRelations(
  userId,
  categoryId,
  accountId
) {
  const category = await query(
    `
    SELECT id, type
    FROM categories
    WHERE id = $1 AND user_id = $2
    `,
    [categoryId, userId]
  );

  const account = await query(
    `
    SELECT id, type
    FROM accounts
    WHERE id = $1 AND user_id = $2
    `,
    [accountId, userId]
  );

  if (!category.rows[0] || !account.rows[0]) {
    return null;
  }

  return {
    category: category.rows[0],
    account: account.rows[0]
  };
}
