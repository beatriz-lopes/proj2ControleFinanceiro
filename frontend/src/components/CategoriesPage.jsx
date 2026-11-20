
import { useEffect, useState } from 'react';
import { get, post, put, del } from '../services/api.js';

const EMPTY = { name: '', type: 'expense' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setCategories(await get('/categories'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      if (editing) {
        await put(`/categories/${editing}`, form);
      } else {
        await post('/categories', form);
      }

      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(category) {
    setEditing(category.id);
    setForm({
      name: category.name,
      type: category.type
    });
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir esta categoria?')) return;

    try {
      await del(`/categories/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h1>Categorias</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editing ? 'Editar categoria' : 'Nova categoria'}</h2>

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
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
        </div>

        <button type="submit">
          {editing ? 'Salvar alterações' : 'Cadastrar'}
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

      <h2>Categorias cadastradas</h2>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {categories.map(category => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>
                    {category.type === 'income'
                      ? 'Entrada'
                      : 'Saída'}
                  </td>
                  <td>
                    <button onClick={() => edit(category)}>
                      Editar
                    </button>

                    <button
                      className="secondary"
                      onClick={() => remove(category.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}

              {!categories.length && (
                <tr>
                  <td colSpan="3">
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
