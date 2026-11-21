import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

const formatAxis = (value) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

function formatMonth(reference) {
  const [year, month] = reference.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function FinancialProjectionChart({ projection = [] }) {
  if (projection.length === 0) {
    return <p className="status">Não há dados disponíveis para a projeção.</p>;
  }

  const data = [
    {
      month: "Início",
      balance: 0,
    },
    ...projection.map((item) => ({
      month: formatMonth(item.reference),
      balance: Number(item.accumulatedVariation),
    })),
  ];

  return (
    <div
      className="financial-projection-chart"
      role="group"
      aria-label="Projeção da variação financeira acumulada"
    >
      <ResponsiveContainer width="100%" height={340}>
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 25,
            left: 20,
            bottom: 10,
          }}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis dataKey="month" tick={{ fontSize: 12 }} />

          <YAxis
            tickFormatter={formatAxis}
            tick={{ fontSize: 12 }}
            width={70}
          />

          <Tooltip
            formatter={(value) => [money(value), "Variação acumulada"]}
          />

          <Legend />

          {/* Linha horizontal indicando o zero */}
          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />

          <Line
            type="monotone"
            dataKey="balance"
            name="Variação acumulada"
            stroke="#2f6fde"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
