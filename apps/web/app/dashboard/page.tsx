"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BudgetChart, ProjectionChart } from "@/components/financial-charts";
import { api, brl } from "@/lib/api";
type Dash = {
  referencePeriod: string;
  operationalBalance: string;
  reserveBalance: string;
  budgets: {
    category: string;
    limit: string;
    spent: string;
    usagePercentage: number;
  }[];
  projection: {
    income: { total: string };
    expenses: { total: string };
    projectedBalance: string;
  };
  bills: {
    id: string;
    dueDate: string;
    status: string;
    currentAmount: string;
    creditCard: { name: string };
  }[];
};
export default function Dashboard() {
  const { data, error } = useQuery({
    queryKey: ["dashboard", "current-reference-period"],
    queryFn: () => api<Dash>("/dashboard"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });
  return (
    <>
      <header className="top">
        <div>
          <div className="label">Visão financeira</div>
          <h1>Dashboard</h1>
        </div>
        <Link className="btn" href="/transactions">
          Ver transações
        </Link>
      </header>
      {error && (
        <div className="card">
          API indisponível. Inicie o backend para ver seus dados.
        </div>
      )}
      <div className="grid">
        {[
          ["Dinheiro disponível", data?.operationalBalance],
          ["Reserva", data?.reserveBalance],
          ["Receitas", data?.projection.income.total],
          ["Despesas", data?.projection.expenses.total],
          ["Saldo projetado", data?.projection.projectedBalance],
        ].map(([l, v]) => (
          <div className="card" key={l}>
            <div className="label">{l}</div>
            <div className="money">{brl(v)}</div>
          </div>
        ))}
      </div>
      <div className="cols">
        <section className="card">
          <h2 className="section-title">
            Orçamento · {data?.referencePeriod ?? "mês atual"}
          </h2>
          {data?.budgets.length ? (
            data.budgets.map((b) => (
              <div className="row" key={b.category}>
                <div style={{ flex: 1 }}>
                  <b>{b.category}</b>
                  <div className="progress">
                    <i
                      style={{
                        width: `${Math.min(Number(b.usagePercentage), 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span>
                  {brl(b.spent)} / {brl(b.limit)}
                </span>
              </div>
            ))
          ) : (
            <div className="empty">
              Defina limites para acompanhar seu orçamento.
            </div>
          )}
        </section>
        <section className="card">
          <h2 className="section-title">Faturas</h2>
          {data?.bills.length ? (
            data.bills.map((b) => (
              <div className="row" key={b.id}>
                <div>
                  <b>{b.creditCard.name}</b>
                  <div className="label">
                    {new Date(b.dueDate).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </div>
                </div>
                <div>
                  <b>{brl(b.currentAmount)}</b>{" "}
                  <span className="badge">{b.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Nenhuma fatura aberta.</div>
          )}
        </section>
      </div>
      <div className="charts-grid">
        <section className="card chart-card-wide">
          <div className="chart-heading">
            <div>
              <div className="label">Próximos 6 meses</div>
              <h2 className="section-title">Evolução financeira</h2>
            </div>
            <span className="badge projected">Inclui projeções</span>
          </div>
          <ProjectionChart startPeriod={data?.referencePeriod} />
        </section>
        <section className="card">
          <div className="label">Mês atual</div>
          <h2 className="section-title">Orçamento por categoria</h2>
          <BudgetChart budgets={data?.budgets ?? []} />
        </section>
      </div>
    </>
  );
}
