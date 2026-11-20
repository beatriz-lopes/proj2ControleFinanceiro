import { useEffect, useState } from "react";
import { getInvoiceForecast } from "../services/reports.js";

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

function formatMonth(reference) {
  const [year, month] = reference.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function InvoicesPage() {
  const [forecast, setForecast] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadInvoices() {
      setLoading(true);
      setError("");

      try {
        const data = await getInvoiceForecast(3);

        if (!active) return;

        setForecast(data);
        setSelectedCardId((previous) => {
          const exists = data.cards.some((card) => card.id === previous);

          return exists ? previous : (data.cards[0]?.id ?? null);
        });
      } catch (err) {
        if (!active) return;

        setError(err.message);
        setForecast(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInvoices();

    return () => {
      active = false;
    };
  }, [reload]);

  const cards = forecast?.cards ?? [];

  const selectedCard = cards.find((card) => card.id === selectedCardId);

  const usedPercentage =
    selectedCard?.creditLimit > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (selectedCard.usedLimit / selectedCard.creditLimit) * 100,
          ),
        )
      : 0;

  return (
    <section className="invoices-page">
      <h1>Faturas de cartão de crédito</h1>

      <p className="status">
        Acompanhe suas compras parceladas, próximas faturas e limites estimados.
      </p>

      {loading && (
        <p className="status" role="status">
          Carregando faturas...
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

      {!loading && !error && cards.length === 0 && (
        <article className="card">
          <p className="status">
            Você ainda não possui cartões de crédito cadastrados.
          </p>
        </article>
      )}

      {!loading && !error && selectedCard && (
        <>
          {/* Seleção do cartão */}
          <article className="card">
            <h2>Selecionar cartão</h2>

            <div className="field">
              <label htmlFor="invoice-card">Cartão de crédito</label>
              <select
                id="invoice-card"
                value={selectedCardId ?? ""}
                onChange={(event) =>
                  setSelectedCardId(Number(event.target.value))
                }
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="status">
              Fechamento: dia {selectedCard.closingDay}
              {" · "}
              Vencimento: dia {selectedCard.dueDay}
            </p>
          </article>

          {/* Resumo do limite do cartão */}
          <div className="summary-grid">
            <article className="card">
              <h3>Limite total</h3>
              <strong>{money(selectedCard.creditLimit)}</strong>
            </article>

            <article className="card">
              <h3>Limite utilizado estimado</h3>
              <strong>{money(selectedCard.usedLimit)}</strong>
            </article>

            <article className="card">
              <h3>Limite disponível estimado</h3>
              <strong>{money(selectedCard.availableLimit)}</strong>
            </article>
          </div>

          <article className="card">
            <h2>Utilização do limite</h2>

            <div
              className="invoice-limit-track"
              role="progressbar"
              aria-label="Percentual de limite utilizado"
              aria-valuenow={usedPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="invoice-limit-bar"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>

            <p className="status">
              {usedPercentage.toFixed(2)}% do limite total comprometido.
            </p>
          </article>

          {/* Lista de faturas */}
          <h2>Fatura aberta e próximas faturas</h2>

          <div className="invoice-list">
            {selectedCard.invoices.map((invoice, index) => (
              <details
                key={`${selectedCard.id}-${invoice.reference}`}
                className={`card invoice-item ${
                  invoice.status === "open" ? "invoice-open" : ""
                }`}
                open={index === 0 ? true : undefined}
              >
                <summary className="invoice-summary">
                  <span className="invoice-summary-info">
                    <strong>{formatMonth(invoice.reference)}</strong>

                    <span className="status">
                      {invoice.status === "open"
                        ? "Fatura aberta"
                        : "Fatura futura"}
                    </span>
                  </span>

                  <strong>{money(invoice.total)}</strong>
                </summary>

                <div className="invoice-details">
                  <div className="invoice-dates">
                    <p>
                      <strong>Fechamento:</strong>{" "}
                      {formatDate(invoice.closingDate)}
                    </p>

                    <p>
                      <strong>Vencimento:</strong> {formatDate(invoice.dueDate)}
                    </p>
                  </div>

                  {invoice.installments.length === 0 ? (
                    <p className="status">
                      Nenhuma compra prevista nesta fatura.
                    </p>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Compra</th>
                            <th>Data da compra</th>
                            <th>Parcela</th>
                            <th>Valor</th>
                          </tr>
                        </thead>

                        <tbody>
                          {invoice.installments.map((item) => (
                            <tr key={item.id}>
                              <td>{item.description}</td>

                              <td>{formatDate(item.purchaseDate)}</td>

                              <td>
                                {item.installmentNumber}/{item.installmentCount}
                              </td>

                              <td>{money(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="invoice-total">
                    <strong>Total da fatura:</strong>{" "}
                    <strong>{money(invoice.total)}</strong>
                  </p>
                </div>
              </details>
            ))}
          </div>

          <p className="status invoice-disclaimer">
            Os limites são estimativas baseadas nas parcelas registradas que
            ainda não venceram. O sistema não registra pagamentos de faturas nem
            consulta o saldo real da instituição financeira.
          </p>
        </>
      )}
    </section>
  );
}
