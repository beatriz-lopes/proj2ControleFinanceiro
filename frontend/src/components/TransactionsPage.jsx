
import { useEffect, useState } from 'react';
import { get, post, put, del } from '../services/api.js';

const EMPTY = {
  type: 'expense',
  description: '',
  amount: '',
  date: new Date().toLocaleDateString('en-CA'),
  categoryId: '',
  accountId: '',
  installments: 1
};

const money = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

export default function TransactionsPage() {
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [result, setResult] = useState({
    transactions: [],
    summary: {},
    pagination: {}
  });

  const [filters, setFilters] = useState({
    start: '',
    end: '',
    type: '',
    categoryId: '',
    accountId: ''
  });

  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  async function loadOptions() {
    const [c, a] = await Promise.all([
      get('/categories'),
      get('/accounts')
    ]);

    setCategories(c);
    setAccounts(a);
  }

  async function load(page = 1) {
    const data = await get('/transactions', {
      ...filters,
      page
    });

    setResult(data);
  }

  useEffect(() => {
    Promise.all([
      loadOptions(),
      load()
    ]).catch(err => setError(err.message));
  }, []);

  const filteredCategories = categories.filter(
    c => c.type === form.type
  );

  const filteredAccounts = accounts.filter(a => {
    if (form.type === 'income') {
      return a.type !== 'credit_card';
    }

    return a.type !== 'income_source';
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const data = {
      ...form,
      categoryId: Number(form.categoryId),
      accountId: Number(form.accountId),
      installments: Number(form.installments),
      amount: Number(form.amount)
    };

    try {
      if (editing) {
        await put(`/transactions/${editing}`, data);
      } else {
        await post('/transactions', data);
      }

      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(transaction) {
    setEditing(transaction.id);

    setForm({
      type: transaction.type,
      description: transaction.description,
      amount: String(transaction.amount),
      date: transaction.date.slice(0, 10),
      categoryId: String(transaction.category_id),
      accountId: String(transaction.account_id),
      installments: transaction.installment_count
    });
  }

  async function remove(transaction) {
    const grouped = transaction.installment_group &&
      transaction.installment_count > 1;

    const all = grouped && window.confirm(
      'Deseja excluir todas as parcelas desta compra? Clique em Cancelar para excluir somente esta parcela.'
    );

    if (!grouped && !window.confirm('Excluir este lançamento?')) {
      return;
    }

    try {
      await del(`/transactions/${transaction.id}`, {
        allInstallments: all ? 'true' : 'false'
      });

      await load(result.pagination.page || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function applyFilters(e) {
    e.preventDefault();

    try {
      await load(1);
    } catch (err) {
      setError(err.message);
    }
  }

  const summary = result.summary || {};
  const pagination = result.pagination || {};

  return (
    <section>
      <h1>Lançamentos financeiros</h1>

      <div className="summary-grid">
        <article className="card">
          <h3>Entradas</h3>
          <strong>{money(summary.income)}</strong>
        </article>

        <article className="card">
          <h3>Saídas</h3>
          <strong>{money(summary.expense)}</strong>
        </article>

        <article className="card">
          <h3>Saldo</h3>
          <strong>{money(summary.balance)}</strong>
        </article>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editing ? 'Editar lançamento' : 'Novo lançamento'}</h2>

        <div className="field">
          <label>Tipo</label>
          <select
            value={form.type}
            onChange={e => setForm({
              ...form,
              type: e.target.value,
              categoryId: '',
              accountId: '',
              installments: 1
            })}
          >
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
        </div>

        <div className="field">
          <label>Descrição</label>
          <input
            required
            maxLength={120}
            value={form.description}
            onChange={e => setForm({
              ...form,
              description: e.target.value
            })}
          />
        </div>

        <div className="field">
          <label>Valor total</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={e => setForm({
              ...form,
              amount: e.target.value
            })}
          />
        </div>

        <div className="field">
          <label>Data</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={e => setForm({
              ...form,
              date: e.target.value
            })}
          />
        </div>

        <div className="field">
          <label>Categoria</label>
          <select
            required
            value={form.categoryId}
            onChange={e => setForm({
              ...form,
              categoryId: e.target.value
            })}
          >
            <option value="">Selecione</option>

            {filteredCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Fonte/destino</label>
          <select
            required
            value={form.accountId}
            onChange={e => setForm({
              ...form,
              accountId: e.target.value,
              installments: 1
            })}
          >
            <option value="">Selecione</option>

            {filteredAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        {form.type === 'expense' &&
          accounts.some(a =>
            a.id === Number(form.accountId) &&
            a.type === 'credit_card'
          ) && (
            <div className="field">
              <label>Quantidade de parcelas</label>
              <input
                type="number"
                min="1"
                max="48"
                value={form.installments}
                onChange={e => setForm({
                  ...form,
                  installments: e.target.value
                })}
              />
            </div>
          )}

        <button type="submit">
          {editing ? 'Salvar alterações' : 'Cadastrar lançamento'}
        </button>

        {editing && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEditing(null);
              setForm(EMPTY);
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      {error && <p className="form-error">{error}</p>}

      <form className="card" onSubmit={applyFilters}>
        <h2>Filtros</h2>

        <div className="field">
          <label>Data inicial</label>
          <input
            type="date"
            value={filters.start}
            onChange={e => setFilters({
              ...filters,
              start: e.target.value
            })}
          />
        </div>

        <div className="field">
          <label>Data final</label>
          <input
            type="date"
            value={filters.end}
            onChange={e => setFilters({
              ...filters,
              end: e.target.value
            })}
          />
        </div>

        <div className="field">
          <label>Tipo</label>
          <select
            value={filters.type}
            onChange={e => setFilters({
              ...filters,
              type: e.target.value
            })}
          >
            <option value="">Todos</option>
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
        </div>

        <div className="field">
          <label>Categoria</label>
          <select
            value={filters.categoryId}
            onChange={e => setFilters({
              ...filters,
              categoryId: e.target.value
            })}
          >
            <option value="">Todas</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Fonte/destino</label>
          <select
            value={filters.accountId}
            onChange={e => setFilters({
              ...filters,
              accountId: e.target.value
            })}
          >
            <option value="">Todas</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <button type="submit">Filtrar</button>

        <button
          type="button"
          className="secondary"
          onClick={async () => {
            setFilters({
              start: '',
              end: '',
              type: '',
              categoryId: '',
              accountId: ''
            });
            await get('/transactions', { page: 1 })
              .then(setResult)
              .catch(err => setError(err.message));
          }}
        >
          Limpar filtros
        </button>
      </form>

      <h2>Movimentações</h2>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Fonte/destino</th>
              <th>Valor</th>
              <th>Parcela</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {result.transactions.map(t => (
              <tr key={t.id}>
                <td>{t.date.slice(0, 10)}</td>
                <td>{t.description}</td>
                <td>{t.category_name}</td>
                <td>{t.account_name}</td>
                <td>{money(t.amount)}</td>
                <td>
                  {t.installment_count > 1
                    ? `${t.installment_number}/${t.installment_count}`
                    : 'À vista'}
                </td>
                <td>
                  <button onClick={() => edit(t)}>
                    Editar
                  </button>

                  <button
                    className="secondary"
                    onClick={() => remove(t)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}

            {!result.transactions.length && (
              <tr>
                <td colSpan="7">Nenhum lançamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={pagination.page <= 1}
          onClick={() => load(pagination.page - 1)}
        >
          Anterior
        </button>

        <span>
          Página {pagination.page || 1} de {pagination.totalPages || 1}
        </span>

        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => load(pagination.page + 1)}
        >
          Próxima
        </button>
      </div>
    </section>
  );
}
