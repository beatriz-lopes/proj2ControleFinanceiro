import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

// Formatação compacta para o eixo horizontal.
const formatAxis = (value) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export default function CategoryExpensesChart({ categories = [] }) {
  const data = categories
    .filter((category) => Number(category.total) > 0)
    .map((category) => ({
      name: category.name,
      total: Number(category.total),
      percentage: Number(category.percentage),
    }));

  if (data.length === 0) {
    return <p className="status">Nenhuma despesa encontrada neste período.</p>;
  }

  // Altura adaptável à quantidade de categorias.
  const chartHeight = Math.max(300, data.length * 58);

  return (
    <div
      className="category-chart"
      role="group"
      aria-label="Gráfico de despesas por categoria"
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 105, left: 10, bottom: 10 }}
          accessibilityLayer
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#e5e7eb"
          />

          <XAxis
            type="number"
            domain={[0, "auto"]}
            tickFormatter={formatAxis}
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />

          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 13 }}
          />

          <Tooltip
            cursor={{ fill: "#f3f6fc" }}
            formatter={(value, name, item) => [
              `${formatCurrency(value)} (${Number(
                item.payload.percentage,
              ).toFixed(2)}%)`,
              "Despesas",
            ]}
          />

          <Bar
            dataKey="total"
            name="Despesas"
            fill="#2f6fde"
            radius={[0, 5, 5, 0]}
            maxBarSize={32}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="total"
              position="right"
              formatter={formatCurrency}
              style={{
                fill: "#1f2430",
                fontSize: 12,
                fontWeight: 500,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
