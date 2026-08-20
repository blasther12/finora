"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, brl } from "@/lib/api";

type Card = {
  id: string;
  name: string;
  institution: string;
  closingDay: number;
  dueDay: number;
  creditLimit: string;
  bills: {
    id: string;
    referenceYear: number;
    referenceMonth: number;
    dueDate: string;
    currentAmount: string;
    projectedAmount: string;
    status: string;
  }[];
};

export function CardDetails({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["card", id],
    queryFn: () => api<Card>(`/credit-cards/${id}`),
  });
  return (
    <>
      <header className="top">
        <div>
          <div className="label">Detalhes do cartão</div>
          <h1>{data?.name ?? "Cartão"}</h1>
        </div>
      </header>
      {error && (
        <div className="card empty">Não foi possível carregar o cartão.</div>
      )}
      {isLoading && <div className="card empty">Carregando…</div>}
      {data && (
        <>
          <div className="summary-grid">
            <div className="card">
              <div className="label">Instituição</div>
              <div className="money text-value">{data.institution}</div>
            </div>
            <div className="card">
              <div className="label">Fechamento / vencimento</div>
              <div className="money text-value">
                Dia {data.closingDay} / {data.dueDay}
              </div>
            </div>
            <div className="card">
              <div className="label">Limite</div>
              <div className="money">{brl(data.creditLimit)}</div>
            </div>
          </div>
          <section className="card resource-card section-gap">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Referência</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Atual</th>
                    <th>Projetado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bills.map((bill) => (
                    <tr key={bill.id}>
                      <td>
                        <Link
                          href={`/cards/${id}/bills/${bill.referenceYear}/${bill.referenceMonth}`}
                        >
                          <b>
                            {String(bill.referenceMonth).padStart(2, "0")}/
                            {bill.referenceYear}
                          </b>
                        </Link>
                      </td>
                      <td>
                        {new Date(bill.dueDate).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })}
                      </td>
                      <td>
                        <span className="badge">{bill.status}</span>
                      </td>
                      <td className="numeric">{brl(bill.currentAmount)}</td>
                      <td className="numeric">{brl(bill.projectedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
