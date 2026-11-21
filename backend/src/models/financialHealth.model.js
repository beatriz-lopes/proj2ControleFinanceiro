import { query } from "../config/db.js";

import {
  calculateInvoice,
  findCreditCardsAndPurchases,
} from "./invoices.model.js";

const reais = (value) => Number((value / 100).toFixed(2));

const percentual = (value) => Number(value.toFixed(2));

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthStart(year, month, offset = 0) {
  return new Date(Date.UTC(year, month + offset, 1));
}

export async function getFinancialHealth(userId) {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  const currentStart = formatDate(monthStart(year, month));
  const nextStart = formatDate(monthStart(year, month, 1));
  const historyStart = formatDate(monthStart(year, month, -3));
  const todayString = formatDate(today);

  const currentResult = await query(
    `
    SELECT
      COALESCE(ROUND(SUM(amount) FILTER (
        WHERE type = 'income'
      ) * 100), 0)::bigint AS income_cents,

      COALESCE(ROUND(SUM(amount) FILTER (
        WHERE type = 'expense'
      ) * 100), 0)::bigint AS expense_cents

    FROM transactions
    WHERE user_id = $1
      AND date >= $2
      AND date < $3
    `,
    [userId, currentStart, nextStart],
  );

  const currentIncome = Number(currentResult.rows[0].income_cents);

  const currentExpenses = Number(currentResult.rows[0].expense_cents);

  const historyResult = await query(
    `
    SELECT
      COALESCE(ROUND(SUM(t.amount) FILTER (
        WHERE t.type = 'income'
      ) * 100), 0)::bigint AS income_cents,

      COALESCE(ROUND(SUM(t.amount) FILTER (
        WHERE t.type = 'expense'
          AND a.type <> 'credit_card'
      ) * 100), 0)::bigint AS expense_cents

    FROM transactions t
    INNER JOIN accounts a
      ON a.id = t.account_id
      AND a.user_id = t.user_id

    WHERE t.user_id = $1
      AND t.date >= $2
      AND t.date < $3
    `,
    [userId, historyStart, currentStart],
  );

  const averageIncome = Number(historyResult.rows[0].income_cents) / 3;

  const averageExpenses = Number(historyResult.rows[0].expense_cents) / 3;

  const { cards, purchases } = await findCreditCardsAndPurchases(userId);

  const futureMonths = [];

  for (let i = 1; i <= 3; i++) {
    const date = monthStart(year, month, i);

    futureMonths.push({
      reference: formatDate(date).slice(0, 7),
      incomeCents: averageIncome,
      regularExpenseCents: averageExpenses,
      cardExpenseCents: 0,
    });
  }

  for (const purchase of purchases) {
    const card = cards.find((item) => item.id === purchase.account_id);

    if (!card) continue;

    const invoice = calculateInvoice(
      purchase.date,
      card,
      purchase.installment_number,
    );

    const targetMonth = futureMonths.find(
      (item) => item.reference === invoice.reference,
    );

    if (targetMonth) {
      targetMonth.cardExpenseCents += Number(purchase.amount_cents);
    }
  }

  const futureCardsCents = futureMonths.reduce(
    (sum, item) => sum + item.cardExpenseCents,
    0,
  );

  const savingRate =
    currentIncome > 0
      ? percentual(((currentIncome - currentExpenses) / currentIncome) * 100)
      : null;

  const expenseRate =
    currentIncome > 0
      ? percentual((currentExpenses / currentIncome) * 100)
      : null;

  const cardCommitment =
    averageIncome > 0
      ? percentual((futureCardsCents / (averageIncome * 3)) * 100)
      : null;

  let accumulatedCents = 0;

  const projection = futureMonths.map((item) => {
    const totalExpenses = item.regularExpenseCents + item.cardExpenseCents;

    const monthlyBalance = item.incomeCents - totalExpenses;

    accumulatedCents += monthlyBalance;

    return {
      reference: item.reference,
      estimatedIncome: reais(item.incomeCents),
      estimatedRegularExpenses: reais(item.regularExpenseCents),
      knownCardInvoices: reais(item.cardExpenseCents),
      estimatedBalance: reais(monthlyBalance),
      accumulatedVariation: reais(accumulatedCents),
    };
  });

  const tips = [];

  if (savingRate === null) {
    tips.push(
      "Não há receitas registradas neste mês para calcular a taxa de poupança.",
    );
  } else if (savingRate < 0) {
    tips.push(
      "Suas despesas ultrapassaram suas receitas neste mês. Revise os maiores gastos.",
    );
  } else if (savingRate < 10) {
    tips.push(
      "Sua taxa de poupança está abaixo de 10%. Considere definir uma meta mensal.",
    );
  } else {
    tips.push(
      "Sua taxa de poupança atingiu pelo menos 10% neste mês. Continue acompanhando seus gastos.",
    );
  }

  if (cardCommitment !== null && cardCommitment > 30) {
    tips.push(
      "As faturas previstas comprometem mais de 30% da renda estimada dos próximos três meses.",
    );
  }

  if (futureCardsCents > 0) {
    tips.push(
      `Você possui ${reais(futureCardsCents).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} em parcelas previstas para os próximos três meses.`,
    );
  }

  if (projection.some((item) => item.accumulatedVariation < 0)) {
    tips.push(
      "A projeção apresenta um resultado acumulado negativo. Avalie possíveis reduções de despesas.",
    );
  }

  if (tips.length === 0) {
    tips.push(
      "Continue registrando suas movimentações para acompanhar sua saúde financeira.",
    );
  }

  return {
    period: {
      start: currentStart,
      end: formatDate(new Date(Date.UTC(year, month + 1, 0))),
    },

    indicators: {
      savingRate,
      expenseRate,
      cardCommitment,
      futureInstallments: reais(futureCardsCents),
    },

    averages: {
      income: reais(averageIncome),
      regularExpenses: reais(averageExpenses),
    },

    projection,
    tips,

    disclaimer:
      "Informações educativas e estimativas. Não constituem recomendação financeira profissional. A projeção parte de saldo inicial zero e não representa o saldo bancário real.",
  };
}
