import { useEffect, useState } from "react";
import { getCategoryReport } from "../services/reports.js";
import CategoryExpensesChart from "./CategoryExpensesChart.jsx";
import AccountsReportSection from "./AccountsReportSection.jsx";

// Formata números no padrão brasileiro.
const money = (value) =>
  Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// Formata datas AAAA-MM-DD para DD/MM/AAAA.
function formatDate(date) {
  if (!date) return "";

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// Obtém o primeiro e o último dia do mês atual.
function getCurrentMonth() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const start = `${year}-${String(month).padStart(2, "0")}-01`;

  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  return { start, end };
}

export default function ReportsPage() {
  const [filters, setFilters] = useState(getCurrentMonth);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("categories");

  // Busca os dados do relatório no back-end.
  async function loadReport(start, end) {
    setLoading(true);
    setError("");

    try {
      const data = await getCategoryReport(start, end);
      setReport(data);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  // Carrega o relatório ao abrir a página.
  useEffect(() => {
    const current = getCurrentMonth();
    loadReport(current.start, current.end);
  }, []);

  // Atualiza o relatório quando o filtro é aplicado.
  function handleFilter(event) {
    event.preventDefault();

    if (filters.start > filters.end) {
      setError("A data inicial não pode ser posterior à final.");
      return;
    }

    loadReport(filters.start, filters.end);
  }

  // Mostra o percentual de aumento ou redução.
  function formatVariation(value) {
    if (value === null || value === undefined) {
      return "Sem base anterior";
    }

    if (value > 0) return `+${value.toFixed(2)}%`;
    if (value < 0) return `${value.toFixed(2)}%`;

    return "0,00%";
  }

  const expenses = report?.categories ?? [];
  const incomes = report?.incomeCategories ?? [];

  const balance = report ? report.totalIncome - report.totalExpenses : 0;

  return (
    <section className="reports-page">
      <h1>Relatórios financeiros</h1>

      <p className="status">
        {activeTab === "categories"
          ? "Analise suas receitas e despesas por categoria."
          : "Acompanhe entradas, saídas e saldos por fonte/destino."}
      </p>

      {/* Filtro de período */}
      <form className="card" onSubmit={handleFilter}>
        <h2>Selecionar período</h2>

        <div className="reports-filters">
          <div className="field">
            <label htmlFor="report-start">Data inicial</label>
            <input
              id="report-start"
              type="date"
              required
              value={filters.start}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  start: event.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label htmlFor="report-end">Data final</label>
            <input
              id="report-end"
              type="date"
              required
              value={filters.end}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  end: event.target.value,
                })
              }
            />
          </div>

          <button type="submit" disabled={loading}>
            Filtrar
          </button>
        </div>
      </form>

      <div
        className="reports-tabs"
        role="tablist"
        aria-label="Tipo de relatório"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "categories"}
          className={activeTab === "categories" ? "active" : ""}
          onClick={() => setActiveTab("categories")}
        >
          Por categoria
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "accounts"}
          className={activeTab === "accounts" ? "active" : ""}
          onClick={() => setActiveTab("accounts")}
        >
          Por fonte/destino
        </button>
      </div>

      {/* Estados de carregamento e erro */}
      {loading && (
        <p className="status" role="status">
          Carregando relatório...
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && report && activeTab === "categories" && (
        <>
          <p className="status">
            Período: {formatDate(report.period.start)}
            {" a "}
            {formatDate(report.period.end)}
          </p>

          {/* Resumo financeiro */}
          <div className="summary-grid">
            <article className="card">
              <h3>Total de receitas</h3>
              <strong>{money(report.totalIncome)}</strong>
            </article>

            <article className="card">
              <h3>Total de despesas</h3>
              <strong>{money(report.totalExpenses)}</strong>
            </article>

            <article className="card">
              <h3>Saldo do período</h3>
              <strong>{money(balance)}</strong>
            </article>
          </div>

          {/* Gráfico de despesas por categoria */}
          <article className="card">
            <h2>Gastos por categoria</h2>

            <p className="status">
              Distribuição das despesas no período selecionado.
            </p>

            <CategoryExpensesChart categories={expenses} />
          </article>

          {/* Tabela comparativa */}
          <article className="card">
            <h2>Despesas por categoria</h2>

            <div className="reports-period-comparison">
              <p className="status">
                <strong>Período atual:</strong>{" "}
                {formatDate(report.period.start)}
                {" a "}
                {formatDate(report.period.end)}
              </p>

              <p className="status">
                <strong>Período anterior:</strong>{" "}
                {formatDate(report.previousPeriod.start)}
                {" a "}
                {formatDate(report.previousPeriod.end)}
              </p>
            </div>

            {expenses.length === 0 ? (
              <p className="status">Não existem despesas para apresentar.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Valor atual</th>
                      <th>% do total</th>
                      <th>Valor anterior</th>
                      <th>Variação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {expenses.map((category) => (
                      <tr key={category.id}>
                        <td>{category.name}</td>
                        <td>{money(category.total)}</td>
                        <td>{category.percentage.toFixed(2)}%</td>
                        <td>{money(category.previousTotal)}</td>
                        <td>{formatVariation(category.variation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {/* Tabela de receitas */}
          <article className="card">
            <h2>Receitas por categoria</h2>

            {incomes.length === 0 ? (
              <p className="status">
                Nenhuma receita encontrada neste período.
              </p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Total recebido</th>
                    </tr>
                  </thead>

                  <tbody>
                    {incomes.map((category) => (
                      <tr key={category.id}>
                        <td>{category.name}</td>
                        <td>{money(category.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </>
      )}

      {/* RF8 - Relatório por fonte/destino */}
      {!loading && report && activeTab === "accounts" && (
        <section aria-label="Relatório por fonte e destino">
          <AccountsReportSection
            start={report.period.start}
            end={report.period.end}
          />
        </section>
      )}
    </section>
  );
}
