import { query } from '../config/db.js';

function lastDayOfMonth(year, month) {
  return new Date(
    Date.UTC(year, month + 1, 0)
  ).getUTCDate();
}


function safeDate(year, month, day) {
  const date = new Date(Date.UTC(year, month, 1));

  const adjustedYear = date.getUTCFullYear();
  const adjustedMonth = date.getUTCMonth();

  const lastDay = lastDayOfMonth(
    adjustedYear,
    adjustedMonth
  );

  return new Date(Date.UTC(
    adjustedYear,
    adjustedMonth,
    Math.min(day, lastDay)
  ));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function calculateInvoice(
  purchaseDate,
  card,
  installmentNumber = 1
) {
  const [year, month, day] = purchaseDate
    .split('-')
    .map(Number);

  const purchaseMonth = month - 1;

  const closingDay = Math.min(
    card.closing_day,
    lastDayOfMonth(year, purchaseMonth)
  );

  let invoiceMonth =
    day < closingDay
      ? purchaseMonth
      : purchaseMonth + 1;


  invoiceMonth += installmentNumber - 1;


  const closingDate = safeDate(
    year,
    invoiceMonth,
    card.closing_day
  );

  const dueMonth =
    card.due_day > card.closing_day
      ? invoiceMonth
      : invoiceMonth + 1;

  const dueDate = safeDate(
    year,
    dueMonth,
    card.due_day
  );

  return {
    reference: formatDate(dueDate).slice(0, 7),
    closingDate: formatDate(closingDate),
    dueDate: formatDate(dueDate)
  };
}

export async function findCreditCardsAndPurchases(userId) {

  const cardsResult = await query(
    `
    SELECT
      id,
      name,
      closing_day,
      due_day,
      credit_limit
    FROM accounts
    WHERE user_id = $1
      AND type = 'credit_card'
    ORDER BY name
    `,
    [userId]
  );

  const purchasesResult = await query(
    `
    SELECT
      t.id,
      t.account_id,
      t.description,
      t.date,
      t.installment_number,
      t.installment_count,
      ROUND(t.amount * 100)::bigint AS amount_cents
    FROM transactions t
    INNER JOIN accounts a
      ON a.id = t.account_id
      AND a.user_id = t.user_id
    WHERE t.user_id = $1
      AND t.type = 'expense'
      AND a.type = 'credit_card'
      AND t.date <= CURRENT_DATE
    ORDER BY t.date, t.id
    `,
    [userId]
  );

  return {
    cards: cardsResult.rows,
    purchases: purchasesResult.rows
  };
}

function sumCents(items) {
  return items.reduce(
    (total, item) => total + item.amountCents,
    0
  );
}

function getInvoicePeriods(card, months, today) {
  const [year, month] = today.split('-').map(Number);

  let closingMonth = month - 1;

  const currentClosing = formatDate(
    safeDate(year, closingMonth, card.closing_day)
  );

  if (today > currentClosing) {
    closingMonth++;
  }

  const periods = [];

  for (let index = 0; index <= months; index++) {
    const closingDate = safeDate(
      year,
      closingMonth + index,
      card.closing_day
    );

    const dueMonth =
      card.due_day > card.closing_day
        ? closingMonth + index
        : closingMonth + index + 1;

    const dueDate = safeDate(
      year,
      dueMonth,
      card.due_day
    );

    const formattedClosing = formatDate(closingDate);
    const formattedDue = formatDate(dueDate);

    periods.push({
      reference: formattedDue.slice(0, 7),
      closingDate: formattedClosing,
      dueDate: formattedDue,
      status: index === 0 ? 'open' : 'future',
      installments: [],
      totalCents: 0
    });
  }

  return periods;
}

export async function getInvoiceForecast(
  userId,
  months = 3
) {
  const today = formatDate(new Date());

  const { cards, purchases } =
    await findCreditCardsAndPurchases(userId);

  const result = [];

  for (const card of cards) {

    const cardPurchases = purchases.filter(
      (purchase) => purchase.account_id === card.id
    );

    const periods = getInvoicePeriods(
      card,
      months,
      today
    );

    const installments = cardPurchases.map((purchase) => {
      const invoice = calculateInvoice(
        purchase.date,
        card,
        purchase.installment_number
      );

      return {
        id: purchase.id,
        description: purchase.description,
        purchaseDate: purchase.date,
        installmentNumber: purchase.installment_number,
        installmentCount: purchase.installment_count,
        amountCents: Number(purchase.amount_cents),
        reference: invoice.reference,
        closingDate: invoice.closingDate,
        dueDate: invoice.dueDate
      };
    });

    for (const period of periods) {
      period.installments = installments.filter(
        (item) => item.closingDate === period.closingDate
      );

      period.totalCents = sumCents(
        period.installments
      );
    }

    const pendingInstallments = installments.filter(
      (item) => item.dueDate >= today
    );

    const usedLimitCents = sumCents(
      pendingInstallments
    );

    const creditLimitCents = Math.round(
      Number(card.credit_limit) * 100
    );

    result.push({
      id: card.id,
      name: card.name,
      closingDay: card.closing_day,
      dueDay: card.due_day,

      creditLimit: creditLimitCents / 100,
      usedLimit: usedLimitCents / 100,
      availableLimit:
        (creditLimitCents - usedLimitCents) / 100,

      invoices: periods.map((period) => ({
        reference: period.reference,
        closingDate: period.closingDate,
        dueDate: period.dueDate,
        status: period.status,
        total: period.totalCents / 100,

        installments: period.installments.map(
          (item) => ({
            id: item.id,
            description: item.description,
            purchaseDate: item.purchaseDate,
            installmentNumber: item.installmentNumber,
            installmentCount: item.installmentCount,
            amount: item.amountCents / 100
          })
        )
      }))
    });
  }

  return {
    referenceDate: today,
    monthsAhead: months,
    cards: result
  };
}
