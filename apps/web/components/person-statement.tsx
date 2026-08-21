"use client";

import { useQuery } from "@tanstack/react-query";
import { api, brl } from "@/lib/api";

type Statement = {
  person: { name: string };
  receivable: string;
  payable: string;
  netBalance: string;
  entries: {
    id: string;
    description: string;
    direction: string;
    amount: string;
    dueDate: string | null;
    status: string;
  }[];
};

export function PersonStatement({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["person-statement", id],
    queryFn: () => api<Statement>(`/people/${id}/statement`),
  });

  return (
    <>
      <header className="top">
        <div>
          <div className="label">Extrato da pessoa</div>
          <h1>{data?.person.name ?? "Pessoa"}</h1>
        </div>
      </header>
      {error && (
        <div className="card empty">Não foi possível carregar o extrato.</div>
      )}
      {isLoading && <div className="card empty">Carregando…</div>}
      {data && (
        <>
          <div className="summary-grid">
            <div className="card">
              <div className="label">A receber</div>
              <div className="money">{brl(data.receivable)}</div>
            </div>
            <div className="card">
              <div className="label">A pagar</div>
              <div className="money">{brl(data.payable)}</div>
            </div>
            <div className="card">
              <div className="label">Saldo líquido</div>
              <div className="money">{brl(data.netBalance)}</div>
            </div>
          </div>
          <section className="card resource-card section-gap">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Direção</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <b>{entry.description}</b>
                      </td>
                      <td>
                        <span className="badge">
                          {entry.direction.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        {entry.dueDate
                          ? new Date(entry.dueDate).toLocaleDateString(
                              "pt-BR",
                              { timeZone: "UTC" },
                            )
                          : "—"}
                      </td>
                      <td>{entry.status}</td>
                      <td className="numeric">{brl(entry.amount)}</td>
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
