import { useEffect, useState } from "react";
import { Link } from "react-router";

import { get } from "../services/api.js";
import { getCategoryReport } from "../services/reports.js";
import CategoryExpensesChart from "./CategoryExpensesChart.jsx";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function getCurrentMonth() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthPeriod(month) {
  const [year, monthNumber] = month.split("-").map(Number);

  const lastDay = new Date(year, monthNumber, 0).getDate();

  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);

  const [transactionsData, setTransactionsData] = useState(null);

  const [categoryReport, setCategoryReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const { start, end } = getMonthPeriod(selectedMonth);

      try {
        const [transactions, categories] = await Promise.all([
          get("/transactions", {
            start,
            end,
            page: 1,
          }),
          getCategoryReport(start, end),
        ]);

        if (!active) return;

        setTransactionsData(transactions);
        setCategoryReport(categories);
      } catch (err) {
        if (!active) return;

        setError(err.message);
        setTransactionsData(null);
        setCategoryReport(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [selectedMonth, reload]);

  const summary = transactionsData?.summary ?? {};

  const recentTransactions = transactionsData?.transactions?.slice(0, 5) ?? [];

  const categories = categoryReport?.categories ?? [];

  return (
    <section className="dashboard-page">
      <h1>Resumo financeiro</h1>

      <p className="status">
        Acompanhe suas principais movimentações e o resultado financeiro do mês.
      </p>

      {/* Seleção do mês */}
      <div className="card">
        <div className="dashboard-month-filter">
          <div className="field">
            <label htmlFor="dashboard-month">
              <h2>Mês de referência</h2>
            </label>

            {/* Seleção do período */}

            <div className="dashboard-month-filter">
              <div className="field">
                <label htmlFor="dashboard-month">Mês</label>

                <select
                  id="dashboard-month"
                  value={selectedMonth.split("-")[1]}
                  onChange={(event) => {
                    const year = selectedMonth.split("-")[0];
                    setSelectedMonth(`${year}-${event.target.value}`);
                  }}
                >
                  {[
                    "Janeiro",
                    "Fevereiro",
                    "Março",
                    "Abril",
                    "Maio",
                    "Junho",
                    "Julho",
                    "Agosto",
                    "Setembro",
                    "Outubro",
                    "Novembro",
                    "Dezembro",
                  ].map((month, index) => (
                    <option
                      key={index}
                      value={String(index + 1).padStart(2, "0")}
                    >
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="dashboard-year">Ano</label>

                <select
                  id="dashboard-year"
                  value={selectedMonth.split("-")[0]}
                  onChange={(event) => {
                    const month = selectedMonth.split("-")[1];
                    setSelectedMonth(`${event.target.value}-${month}`);
                  }}
                >
                  {Array.from(
                    { length: new Date().getFullYear() - 2020 + 4 },
                    (_, index) => 2020 + index,
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <p className="status" role="status">
          Carregando resumo financeiro...
        </p>
      )}

      {error && (
        <div className="card" role="alert">
          <p className="form-error">{error}</p>

          <button type="button" onClick={() => setReload((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && transactionsData && (
        <>
          {/* Resumo do período */}
          <p className="status">
            Período: {formatDate(`${selectedMonth}-01`)}
            {" a "}
            {formatDate(getMonthPeriod(selectedMonth).end)}
          </p>

          <div className="summary-grid">
            <article className="card">
              <h3>Total de entradas</h3>
              <strong>{money(summary.income)}</strong>
            </article>

            <article className="card">
              <h3>Total de saídas</h3>
              <strong>{money(summary.expense)}</strong>
            </article>

            <article className="card">
              <h3>Saldo do período</h3>
              <strong>{money(summary.balance)}</strong>
            </article>
          </div>

          {/* Gráfico de categorias */}
          <article className="card">
            <div className="dashboard-section-header">
              <h2>Gastos por categoria</h2>

              <Link to="/reports">Ver relatórios</Link>
            </div>

            <p className="status">
              Distribuição das despesas no mês selecionado.
            </p>

            <CategoryExpensesChart categories={categories} />
          </article>

          {/* Últimas movimentações */}
          <article className="card">
            <div className="dashboard-section-header">
              <h2>Últimas movimentações</h2>

              <Link to="/transactions">Ver lançamentos</Link>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="status">
                Nenhuma movimentação registrada neste mês.
              </p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentTransactions.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.date)}</td>

                        <td>
                          {item.description}

                          {item.installment_count > 1 && (
                            <span className="dashboard-installment">
                              {" "}
                              ({item.installment_number}/
                              {item.installment_count})
                            </span>
                          )}
                        </td>

                        <td>{item.category_name}</td>

                        <td>{item.type === "income" ? "Entrada" : "Saída"}</td>

                        <td>
                          {item.type === "income" ? "+" : "-"}
                          {money(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {/* Acesso rápido */}
          <article className="card">
            <h2>Acesso rápido</h2>

            <div className="dashboard-actions">
              <Link to="/transactions">Gerenciar lançamentos</Link>

              <Link to="/invoices">Consultar faturas</Link>

              <Link to="/financial-health">Saúde financeira</Link>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
