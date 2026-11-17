// Sample data: 2 users with 3 months of transactions (current month and the 2 previous ones).
// Dates are relative to today, so the "current month" always has data.
// Password of both test users: Senha1234
// Descriptions, category and account names are user data, so they are in Portuguese.
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { withTransaction } from '../src/config/db.js';
import { BCRYPT_ROUNDS } from '../src/config/auth.js';
import { create, createDefaults } from '../src/models/users.model.js';

const TEST_PASSWORD = 'Senha1234';

// 'YYYY-MM-DD' for day `day` of (current month + monthOffset)
function date(monthOffset, day) {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, day);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Split in cents; the remainder goes to the 1st installment (100.00 in 3x = 33.34 + 33.33 + 33.33)
function splitInstallments(amount, count) {
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base) / 100);
}

async function createUser(client, { name, email, cpf }) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
  const user = await create({ name, email, cpf, passwordHash }, client);
  await createDefaults(user.id, client);
  return user;
}

async function createAccount(client, userId, a) {
  await client.query(
    `INSERT INTO accounts (user_id, name, type, closing_day, due_day, credit_limit, emergency_reserve)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, a.name, a.type, a.closingDay ?? null, a.dueDay ?? null, a.creditLimit ?? null, a.emergencyReserve ?? false],
  );
}

// Lookup tables: category id by "type:name" and account id by name
async function lookups(client, userId) {
  const categories = await client.query('SELECT id, name, type FROM categories WHERE user_id = $1', [userId]);
  const accounts = await client.query('SELECT id, name FROM accounts WHERE user_id = $1', [userId]);
  return {
    category: Object.fromEntries(categories.rows.map((c) => [`${c.type}:${c.name}`, c.id])),
    account: Object.fromEntries(accounts.rows.map((a) => [a.name, a.id])),
  };
}

async function addTransaction(client, userId, ids, t) {
  const amounts = splitInstallments(t.amount, t.installments ?? 1);
  const group = amounts.length > 1 ? randomUUID() : null;
  for (let i = 0; i < amounts.length; i++) {
    await client.query(
      `INSERT INTO transactions
         (user_id, type, description, amount, date, category_id, account_id,
          installment_number, installment_count, installment_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId, t.type, t.description, amounts[i], t.date,
        ids.category[`${t.type}:${t.category}`], ids.account[t.account],
        i + 1, amounts.length, group,
      ],
    );
  }
}

export async function seed() {
  await withTransaction(async (client) => {
    // ---------- Ana ----------
    const ana = await createUser(client, { name: 'Ana Souza', email: 'ana@email.com', cpf: '52998224725' });
    await createAccount(client, ana.id, { name: 'Nubank', type: 'credit_card', closingDay: 3, dueDay: 10, creditLimit: 5000 });
    await createAccount(client, ana.id, { name: 'Visa crédito', type: 'credit_card', closingDay: 25, dueDay: 5, creditLimit: 3000 });
    await createAccount(client, ana.id, { name: 'Poupança', type: 'bank_account', emergencyReserve: true });
    const a = await lookups(client, ana.id);

    for (const month of [-2, -1, 0]) {
      const extra = (month + 3) * 37; // varies spending a bit between months
      const list = [
        { type: 'income', description: 'Salário', amount: 6500, date: date(month, 5), category: 'Salário', account: 'Conta corrente' },
        { type: 'expense', description: 'Aluguel', amount: 1800, date: date(month, 6), category: 'Moradia', account: 'Conta corrente' },
        { type: 'expense', description: 'Conta de luz', amount: 180 + extra / 3, date: date(month, 12), category: 'Moradia', account: 'Conta corrente' },
        { type: 'expense', description: 'Supermercado', amount: 750 + extra, date: date(month, 9), category: 'Alimentação', account: 'Nubank' },
        { type: 'expense', description: 'Restaurante', amount: 140 + extra / 2, date: date(month, 18), category: 'Alimentação', account: 'Visa crédito' },
        { type: 'expense', description: 'Uber', amount: 95 + extra / 4, date: date(month, 15), category: 'Mobilidade', account: 'Nubank' },
        { type: 'expense', description: 'Farmácia', amount: 85, date: date(month, 20), category: 'Saúde', account: 'Conta corrente' },
        { type: 'expense', description: 'Cinema', amount: 60, date: date(month, 22), category: 'Lazer', account: 'Nubank' },
        { type: 'expense', description: 'Curso de inglês', amount: 320, date: date(month, 8), category: 'Educação', account: 'Conta corrente' },
        { type: 'expense', description: 'Transferência para poupança', amount: 500, date: date(month, 7), category: 'Outros', account: 'Conta corrente' },
        { type: 'income', description: 'Depósito na poupança', amount: 500, date: date(month, 7), category: 'Outros', account: 'Poupança' },
      ];
      for (const t of list) await addTransaction(client, ana.id, a, t);
    }
    // Installment purchases (purchase date is the same in every installment)
    await addTransaction(client, ana.id, a, { type: 'expense', description: 'Notebook', amount: 3600, installments: 10, date: date(-2, 12), category: 'Educação', account: 'Nubank' });
    await addTransaction(client, ana.id, a, { type: 'expense', description: 'Fone de ouvido', amount: 100, installments: 3, date: date(-1, 3), category: 'Lazer', account: 'Nubank' });
    await addTransaction(client, ana.id, a, { type: 'expense', description: 'Passagem aérea', amount: 1250, installments: 5, date: date(0, 26), category: 'Lazer', account: 'Visa crédito' });

    // ---------- Bruno ----------
    const bruno = await createUser(client, { name: 'Bruno Lima', email: 'bruno@email.com', cpf: '11144477735' });
    await createAccount(client, bruno.id, { name: 'Inter', type: 'credit_card', closingDay: 28, dueDay: 7, creditLimit: 2500 });
    await createAccount(client, bruno.id, { name: 'Freelance', type: 'income_source' });
    const b = await lookups(client, bruno.id);

    for (const month of [-2, -1, 0]) {
      const list = [
        { type: 'income', description: 'Salário', amount: 3800, date: date(month, 1), category: 'Salário', account: 'Conta corrente' },
        { type: 'income', description: 'Projeto freelance', amount: 900 + month * 150, date: date(month, 20), category: 'Outros', account: 'Freelance' },
        { type: 'expense', description: 'Aluguel', amount: 1400, date: date(month, 5), category: 'Moradia', account: 'Conta corrente' },
        { type: 'expense', description: 'Mercado', amount: 620 - month * 40, date: date(month, 10), category: 'Alimentação', account: 'Inter' },
        { type: 'expense', description: 'Ônibus', amount: 180, date: date(month, 2), category: 'Mobilidade', account: 'Conta corrente' },
        { type: 'expense', description: 'Academia', amount: 110, date: date(month, 4), category: 'Saúde', account: 'Inter' },
        { type: 'expense', description: 'Show', amount: 250, date: date(month, 16), category: 'Lazer', account: 'Inter' },
      ];
      for (const t of list) await addTransaction(client, bruno.id, b, t);
    }
    await addTransaction(client, bruno.id, b, { type: 'expense', description: 'Celular', amount: 2400, installments: 12, date: date(-1, 14), category: 'Outros', account: 'Inter' });
  });
}
