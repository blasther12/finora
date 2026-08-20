"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, brl } from "@/lib/api";

type Projection = {
  period: string;
  income: { confirmed: string; projected: string; total: string };
  expenses: { confirmed: string; projected: string; total: string };
  projectedBalance: string;
};

type Budget = {
  category: string;
  limit: string;
  spent: string;
};

function nextMonths(startPeriod: string, quantity: number) {
  const [startYear, startMonth] = startPeriod.split("-").map(Number);
  return Array.from({ length: quantity }, (_, index) => {
    const absoluteMonth = startYear * 12 + startMonth - 1 + index;
    return {
      year: Math.floor(absoluteMonth / 12),
      month: (absoluteMonth % 12) + 1,
    };
  });
}

const compactMoney = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 1,
});

export function ProjectionChart({
  months = 6,
  startPeriod,
}: {
  months?: number;
  startPeriod?: string;
}) {
  const { data: currentPeriod } = useQuery({
    queryKey: ["reference-period"],
    queryFn: () => api<{ value: string }>("/reference-period"),
    enabled: !startPeriod,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });
  const effectiveStartPeriod = startPeriod ?? currentPeriod?.value;
  const periods = effectiveStartPeriod
    ? nextMonths(effectiveStartPeriod, months)
    : [];
  const { data, isLoading, error } = useQuery({
    queryKey: ["projection-chart", effectiveStartPeriod, months],
    enabled: periods.length > 0,
    queryFn: () =>
      Promise.all(
        periods.map(({ year, month }) =>
          api<Projection>(`/projections/${year}/${month}`),
        ),
      ),
  });

  const chartData = data?.map((projection) => ({
    month: new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit",
    }).format(new Date(`${projection.period}-02T12:00:00`)),
    receitas: Number(projection.income.total),
    despesas: Number(projection.expenses.total),
    saldo: Number(projection.projectedBalance),
  }));

  if (isLoading)
    return <div className="chart-state">Carregando projeções…</div>;
  if (error)
    return (
      <div className="chart-state">Não foi possível carregar as projeções.</div>
    );

  return (
    <div
      className="chart-container"
      role="img"
      aria-label="Projeção financeira dos próximos meses"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="var(--line)"
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            stroke="var(--muted)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted)"
            tickFormatter={(value: number) => compactMoney.format(value)}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip
            formatter={(value) => brl(value)}
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="receitas"
            name="Receitas"
            stroke="#2caf7d"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="despesas"
            name="Despesas"
            stroke="#e46b5d"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            name="Saldo"
            stroke="#5b8def"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BudgetChart({ budgets }: { budgets: Budget[] }) {
  if (!budgets.length)
    return (
      <div className="chart-state">
        Defina orçamentos para visualizar o comparativo.
      </div>
    );

  const chartData = budgets.map((budget) => ({
    category: budget.category,
    limite: Number(budget.limit),
    gasto: Number(budget.spent),
  }));

  return (
    <div
      className="chart-container"
      role="img"
      aria-label="Gastos e limites por categoria"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="var(--line)"
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            dataKey="category"
            stroke="var(--muted)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted)"
            tickFormatter={(value: number) => compactMoney.format(value)}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip
            formatter={(value) => brl(value)}
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
          />
          <Legend />
          <Bar
            dataKey="limite"
            name="Limite"
            fill="#8fa6a0"
            radius={[5, 5, 0, 0]}
          />
          <Bar
            dataKey="gasto"
            name="Gasto"
            fill="#2caf7d"
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
