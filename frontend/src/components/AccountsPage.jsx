
import { useEffect, useState } from 'react';
import { get, post, put, del } from '../services/api.js';

const EMPTY = {
  name: '',
  type: 'bank_account',
  closingDay: '',
  dueDay: '',
  creditLimit: '',
  emergencyReserve: false
};

const TYPES = {
  income_source: 'Fonte de renda',
  bank_account: 'Conta bancária',
  credit_card: 'Cartão de crédito'
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setAccounts(await get('/accounts'));
  }

  useEffect(() => {
    load().catch(err => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const data = {
      ...form,
      closingDay: form.type === 'credit_card'
        ? Number(form.closingDay) : null,
      dueDay: form.type === 'credit_card'
        ? Number(form.dueDay) : null,
      creditLimit: form.type === 'credit_card'
        ? form.creditLimit : null
    };

    try {
      if (editing) {
        await put(`/accounts/${editing}`, data);
      } else {
        await post('/accounts', data);
      }

      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(account) {
    setEditing(account.id);

    setForm({
      name: account.name,
      type: account.type,
      closingDay: account.closing_day ?? '',
      dueDay: account.due_day ?? '',
      creditLimit: account.credit_limit ?? '',
      emergencyReserve: account.emergency_reserve
    });
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir esta fonte/destino?')) return;

    try {
      await del(`/accounts/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h1>Fontes e destinos</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editing ? 'Editar' : 'Cadastrar'}</h2>

        <div className="field">
          <label>Nome</label>
          <input
            required
            maxLength={60}
            value={form.name}
            onChange={e => setForm({
              ...form,
              name: e.target.value
            })}
          />
        </div>

        <div className="field">
          <label>Tipo</label>
          <select
            value={form.type}
            onChange={e => setForm({
              ...form,
              type: e.target.value
            })}
          >
            <option value="income_source">Fonte de renda</option>
            <option value="bank_account">Conta bancária</option>
            <option value="credit_card">Cartão de crédito</option>
          </select>
        </div>

        {form.type === 'credit_card' && (
          <>
            <div className="field">
              <label>Dia de fechamento</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={form.closingDay}
                onChange={e => setForm({
                  ...form,
                  closingDay: e.target.value
                })}
              />
            </div>

            <div className="field">
              <label>Dia de vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={form.dueDay}
                onChange={e => setForm({
                  ...form,
                  dueDay: e.target.value
                })}
              />
            </div>

            <div className="field">
              <label>Limite</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.creditLimit}
                onChange={e => setForm({
                  ...form,
                  creditLimit: e.target.value
                })}
              />
            </div>
          </>
        )}

        {form.type === 'bank_account' && (
          <label>
            <input
              type="checkbox"
              checked={form.emergencyReserve}
              onChange={e => setForm({
                ...form,
                emergencyReserve: e.target.checked
              })}
            />
            Conta de reserva de emergência
          </label>
        )}

        <button type="submit">
          {editing ? 'Salvar alterações' : 'Cadastrar'}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      <h2>Fontes e destinos cadastrados</h2>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Fechamento</th>
              <th>Vencimento</th>
              <th>Limite</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {accounts.map(account => (
              <tr key={account.id}>
                <td>{account.name}</td>
                <td>{TYPES[account.type]}</td>
                <td>{account.closing_day ?? '-'}</td>
                <td>{account.due_day ?? '-'}</td>
                <td>
                  {account.credit_limit
                    ? `R$ ${Number(account.credit_limit).toFixed(2)}`
                    : '-'}
                </td>
                <td>
                  <button onClick={() => edit(account)}>
                    Editar
                  </button>

                  <button
                    className="secondary"
                    onClick={() => remove(account.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
