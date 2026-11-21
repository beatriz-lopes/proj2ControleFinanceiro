import { useEffect, useState } from "react";

import { getFinancialHealth } from "../services/financialHealth.js";
import FinancialProjectionChart from "./FinancialProjectionChart.jsx";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

const percentage = (value) => {
  if (value === null || value === undefined) {
    return "Não disponível";
  }

  return `${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
};

function formatMonth(reference) {
  const [year, month] = reference.split("-").map(Number);

  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function FinancialHealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      setLoading(true);
      setError("");

      try {
        const data = await getFinancialHealth();

        if (active) {
          setHealth(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setHealth(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHealth();

    return () => {
      active = false;
    };
  }, [reload]);

  return (
    <section className="financial-health-page">
      <h1>Saúde financeira</h1>

      <p className="status">
        Acompanhe seus indicadores financeiros, visualize projeções e receba
        dicas de economia.
      </p>

      {/* Carregamento */}
      {loading && (
        <p className="status" role="status">
          Carregando sua saúde financeira...
        </p>
      )}

      {/* Tratamento de erros */}
      {error && (
        <article className="card" role="alert">
          <p className="form-error">{error}</p>

          <button type="button" onClick={() => setReload((value) => value + 1)}>
            Tentar novamente
          </button>
        </article>
      )}

      {/* Conteúdo principal */}
      {!loading && !error && health && (
        <>
          <p className="status">
            Indicadores referentes a {formatDate(health.period.start)}
            {" até "}
            {formatDate(health.period.end)}. Os dados do mês podem estar
            incompletos.
          </p>

          {/* Indicadores financeiros */}
          <div className="summary-grid">
            <article className="card">
              <h3>Taxa de poupança</h3>

              <strong>{percentage(health.indicators.savingRate)}</strong>

              <p className="status">
                Parcela das receitas não comprometida com despesas no mês.
              </p>
            </article>

            <article className="card">
              <h3>Taxa de despesas</h3>

              <strong>{percentage(health.indicators.expenseRate)}</strong>

              <p className="status">
                Percentual das receitas destinado às despesas registradas.
              </p>
            </article>

            <article className="card">
              <h3>Comprometimento com cartões</h3>

              <strong>{percentage(health.indicators.cardCommitment)}</strong>

              <p className="status">
                Faturas dos próximos três meses em relação à renda estimada.
              </p>
            </article>

            <article className="card">
              <h3>Parcelas futuras</h3>

              <strong>{money(health.indicators.futureInstallments)}</strong>

              <p className="status">
                Total das parcelas previstas para os próximos três meses.
              </p>
            </article>
          </div>

          {/* Gráfico de evolução financeira */}
          <article className="card">
            <h2>Projeção financeira</h2>

            <p className="status">
              Variação financeira acumulada estimada para os próximos três
              meses, partindo de saldo inicial zero.
            </p>

            <FinancialProjectionChart projection={health.projection} />
          </article>

          {/* Detalhamento da projeção */}
          <article className="card">
            <h2>Detalhamento da projeção</h2>

            <p className="status">
              Estimativa baseada na média dos últimos três meses completos e nas
              parcelas futuras já registradas.
            </p>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Receita estimada</th>
                    <th>Despesas comuns</th>
                    <th>Faturas previstas</th>
                    <th>Resultado mensal</th>
                    <th>Variação acumulada</th>
                  </tr>
                </thead>

                <tbody>
                  {health.projection.map((item) => (
                    <tr key={item.reference}>
                      <td>{formatMonth(item.reference)}</td>

                      <td>{money(item.estimatedIncome)}</td>

                      <td>{money(item.estimatedRegularExpenses)}</td>

                      <td>{money(item.knownCardInvoices)}</td>

                      <td>{money(item.estimatedBalance)}</td>

                      <td>{money(item.accumulatedVariation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* Médias utilizadas nos cálculos */}
          <article className="card">
            <h2>Base dos cálculos</h2>

            <p className="status">
              Médias utilizadas para estimar receitas e despesas nos próximos
              meses.
            </p>

            <div className="financial-health-averages">
              <div>
                <span>Renda média mensal</span>
                <strong>{money(health.averages.income)}</strong>
              </div>

              <div>
                <span>Despesas comuns médias</span>
                <strong>{money(health.averages.regularExpenses)}</strong>
              </div>
            </div>
          </article>

          {/* Dicas automáticas */}
          <article className="card">
            <h2>Dicas de economia</h2>

            <p className="status">
              Sugestões educativas geradas a partir dos seus indicadores
              financeiros.
            </p>

            {health.tips.length === 0 ? (
              <p className="status">Nenhuma dica disponível no momento.</p>
            ) : (
              <ul className="financial-health-tips">
                {health.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            )}
          </article>

          {/* Aviso obrigatório do enunciado */}
          <aside className="financial-health-disclaimer" role="note">
            <strong>Importante:</strong> {health.disclaimer}
          </aside>
        </>
      )}
    </section>
  );
}
