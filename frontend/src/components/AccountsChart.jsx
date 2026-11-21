import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export default function AccountsChart({ accounts = [] }) {

  const data = accounts
    .filter((account) => account.totalIncome > 0 || account.totalExpenses > 0)
    .map((account) => ({
      name: account.name,
      income: Number(account.totalIncome),
      expense: Number(account.totalExpenses),
    }));

  if (data.length === 0) {
    return (
      <p className="status">Nenhuma movimentação encontrada neste período.</p>
    );
  }

  const chartHeight = Math.max(320, data.length * 75);

  return (
    <div
      className="accounts-chart"
      role="group"
      aria-label="Gráfico de entradas e saídas por fonte e destino"
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 15,
            right: 30,
            left: 20,
            bottom: 10,
          }}
          accessibilityLayer
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#e5e7eb"
          />

          <XAxis
            type="number"
            tickFormatter={formatAxis}
            tick={{ fontSize: 12 }}
          />

          <YAxis
            type="category"
            dataKey="name"
            width={115}
            tick={{ fontSize: 12 }}
          />

          <Tooltip formatter={(value) => money(value)} />

          <Legend />

          <Bar
            dataKey="income"
            name="Entradas"
            fill="#1b8a4b"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            isAnimationActive={false}
          />

          <Bar
            dataKey="expense"
            name="Saídas"
            fill="#c62828"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
