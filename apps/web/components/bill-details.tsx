"use client";

import { useQuery } from "@tanstack/react-query";
import { api, brl } from "@/lib/api";

type Bill = {
  creditCard: { name: string };
  referenceYear: number;
  referenceMonth: number;
  dueDate: string;
  currentAmount: string;
  projectedAmount: string;
  status: string;
  transactions: {
    id: string;
    description: string;
    transactionDate: string;
    amount: string;
    status: string;
    category: { name: string } | null;
  }[];
};

export function BillDetails({
  cardId,
  year,
  month,
}: {
  cardId: string;
  year: string;
  month: string;
}) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["bill", cardId, year, month],
    queryFn: () => api<Bill>(`/credit-cards/${cardId}/bills/${year}/${month}`),
  });
  return (
    <>
      <header className="top">
        <div>
          <div className="label">Detalhes da fatura</div>
          <h1>
            {data
              ? `${data.creditCard.name} · ${String(data.referenceMonth).padStart(2, "0")}/${data.referenceYear}`
              : "Fatura"}
          </h1>
        </div>
      </header>
      {error && (
        <div className="card empty">Não foi possível carregar a fatura.</div>
      )}
      {isLoading && <div className="card empty">Carregando…</div>}
      {data && (
        <>
          <div className="summary-grid">
            <div className="card">
              <div className="label">Valor atual</div>
              <div className="money">{brl(data.currentAmount)}</div>
            </div>
            <div className="card">
              <div className="label">Valor projetado</div>
              <div className="money">{brl(data.projectedAmount)}</div>
            </div>
            <div className="card">
              <div className="label">Vencimento</div>
              <div className="money text-value">
                {new Date(data.dueDate).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}
              </div>
            </div>
          </div>
          <section className="card resource-card section-gap">
            {data.transactions.length ? (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Status</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <b>{transaction.description}</b>
                        </td>
                        <td>
                          {new Date(
                            transaction.transactionDate,
                          ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </td>
                        <td>{transaction.category?.name ?? "—"}</td>
                        <td>
                          <span
                            className={`badge ${transaction.status === "PROJECTED" ? "projected" : ""}`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="numeric">{brl(transaction.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                A fatura possui valor consolidado, mas ainda não tem itens
                vinculados.
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
