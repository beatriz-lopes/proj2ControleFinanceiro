
import { query } from '../config/db.js';


function emReais(centavos) {
  return Number(centavos) / 100;
}


function calcularVariacao(atual, anterior) {
  if (anterior === 0) {
    return atual === 0 ? 0 : null;
  }

  return Number(
    (((atual - anterior) / anterior) * 100).toFixed(2)
  );
}

// Consulta receitas e despesas agrupadas por categoria.
export async function reportByCategory(
  userId,
  start,
  end,
  previousStart,
  previousEnd
) {
  const { rows } = await query(
    `
    SELECT
      c.id,
      c.name,
      c.type,

      COALESCE(
        ROUND(SUM(t.amount) FILTER (
          WHERE t.date BETWEEN $2 AND $3
        ) * 100), 0
      )::bigint AS current_cents,

      COALESCE(
        ROUND(SUM(t.amount) FILTER (
          WHERE t.date BETWEEN $4 AND $5
        ) * 100), 0
      )::bigint AS previous_cents

    FROM transactions t

    INNER JOIN categories c
      ON c.id = t.category_id
      AND c.user_id = t.user_id

    WHERE t.user_id = $1
      AND t.date BETWEEN $4 AND $3

    GROUP BY c.id, c.name, c.type
    `,
    [userId, start, end, previousStart, previousEnd]
  );

 
  const expenses = rows.filter(
    (row) => row.type === 'expense' &&
      (
        Number(row.current_cents) > 0 || Number(row.previous_cents) > 0
      )
  );

  const incomes = rows.filter(
    (row) => row.type === 'income' &&
      Number(row.current_cents) > 0
  );

 
  const totalExpenseCents = expenses.reduce(
    (total, item) => total + Number(item.current_cents),
    0
  );

 
  const totalIncomeCents = incomes.reduce(
    (total, item) => total + Number(item.current_cents),
    0
  );

  // Monta o relatório de despesas.
  const categories = expenses.map((item) => {
    const current = Number(item.current_cents);
    const previous = Number(item.previous_cents);

    return {
      id: item.id,
      name: item.name,
      total: emReais(current),

      percentage: Number(
        ((current / totalExpenseCents) * 100).toFixed(2)
      ),

      previousTotal: emReais(previous),

      variation: calcularVariacao(current, previous)
    };
  });


  categories.sort((a, b) => b.total - a.total);

  // Monta o relatório de receitas.
  const incomeCategories = incomes.map((item) => ({
    id: item.id,
    name: item.name,
    total: emReais(item.current_cents)
  }));

  incomeCategories.sort((a, b) => b.total - a.total);

  return {
    period: {
      start,
      end
    },

    previousPeriod: {
      start: previousStart,
      end: previousEnd
    },

    totalExpenses: emReais(totalExpenseCents),
    totalIncome: emReais(totalIncomeCents),

    categories,
    incomeCategories
  };
}

/** RF8 - Relatório por fonte/destino. */

export async function reportByAccount(userId, start, end) {
  const { rows } = await query(
    `
    SELECT
      a.id,
      a.name,
      a.type,

      COALESCE(
        ROUND(SUM(t.amount) FILTER (
          WHERE t.type = 'income'
        ) * 100), 0
      )::bigint AS income_cents,

      COALESCE(
        ROUND(SUM(t.amount) FILTER (
          WHERE t.type = 'expense'
        ) * 100), 0
      )::bigint AS expense_cents

    FROM accounts a

    LEFT JOIN transactions t
      ON t.account_id = a.id
      AND t.user_id = a.user_id
      AND t.date BETWEEN $2 AND $3

    WHERE a.user_id = $1

    GROUP BY a.id, a.name, a.type
    ORDER BY a.name
    `,
    [userId, start, end]
  );

  // Converte os resultados para valores numéricos.
  const accounts = rows.map((row) => {
    const incomeCents = Number(row.income_cents);
    const expenseCents = Number(row.expense_cents);

    return {
      id: row.id,
      name: row.name,
      type: row.type,

      totalIncome: incomeCents / 100,
      totalExpenses: expenseCents / 100,

      // O saldo é exibido somente para contas.
      balance: row.type === 'bank_account'
        ? (incomeCents - expenseCents) / 100
        : null
    };
  });

  // Totais gerais, calculados em centavos.
  const totalIncomeCents = rows.reduce(
    (total, row) =>
      total + Number(row.income_cents),
    0
  );

  const totalExpenseCents = rows.reduce(
    (total, row) =>
      total + Number(row.expense_cents),
    0
  );

  return {
    period: {
      start,
      end
    },

    totalIncome: totalIncomeCents / 100,
    totalExpenses: totalExpenseCents / 100,

    balance:
      (totalIncomeCents - totalExpenseCents) / 100,

    accounts
  };
}

