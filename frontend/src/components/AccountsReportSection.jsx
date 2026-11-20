import { useEffect, useState } from "react";

import { getAccountReport } from "../services/reports.js";
import AccountsChart from "./AccountsChart.jsx";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

function accountType(type) {
  const types = {
    bank_account: "Conta bancária",
    credit_card: "Cartão de crédito",
    income_source: "Fonte de renda",
  };

  return types[type] ?? type;
}

export default function AccountsReportSection({ start, end }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Busca o relatório sempre que o período muda.
  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      setLoading(true);
      setError("");

      try {
        const data = await getAccountReport(start, end);

        if (active) {
          setReport(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setReport(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      active = false;
    };
  }, [start, end]);

  if (loading) {
    return (
      <p className="status" role="status">
        Carregando relatório por fonte/destino...
      </p>
    );
  }

  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }

  if (!report) return null;

  const accounts = report.accounts ?? [];

  return (
    <div className="accounts-report">
      <div className="summary-grid">
        <article className="card">
          <h3>Total de entradas</h3>
          <strong>{money(report.totalIncome)}</strong>
        </article>

        <article className="card">
          <h3>Total de saídas</h3>
          <strong>{money(report.totalExpenses)}</strong>
        </article>

        <article className="card">
          <h3>Saldo líquido do período</h3>
          <strong>{money(report.balance)}</strong>
        </article>
      </div>

      {/* Gráfico do RF8 */}
      <article className="card">
        <h2>Movimentações por fonte/destino</h2>

        <p className="status">Comparação de entradas e saídas no período.</p>

        <AccountsChart accounts={accounts} />
      </article>

      {/* Tabela do RF8 */}
      <article className="card">
        <h2>Detalhamento por fonte/destino</h2>

        {accounts.length === 0 ? (
          <p className="status">Nenhuma fonte/destino cadastrada.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fonte/destino</th>
                  <th>Tipo</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Saldo</th>
                </tr>
              </thead>

              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>

                    <td>{accountType(account.type)}</td>

                    <td>{money(account.totalIncome)}</td>

                    <td>{money(account.totalExpenses)}</td>

                    <td>
                      {account.balance === null ? "—" : money(account.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="status">
          O saldo representa a diferença entre entradas e saídas da conta no
          período selecionado, não necessariamente o saldo bancário atual.
        </p>
      </article>
    </div>
  );
}
