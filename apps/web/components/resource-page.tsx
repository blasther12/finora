"use client";
import { useQuery } from "@tanstack/react-query";
import { api, brl } from "@/lib/api";
export function ResourcePage({
  title,
  path,
  kind = "name",
}: {
  title: string;
  path: string;
  kind?: string;
}) {
  const { data, error, isLoading } = useQuery({
    queryKey: [path],
    queryFn: () => api<Record<string, unknown>[]>(path),
  });
  return (
    <>
      <header className="top">
        <div>
          <div className="label">Finora</div>
          <h1>{title}</h1>
        </div>
        <button className="btn">+ Adicionar</button>
      </header>
      <section className="card">
        {isLoading && <div className="empty">Carregando…</div>}
        {error && (
          <div className="empty">Não foi possível consultar a API.</div>
        )}
        {data?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Status / Tipo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  <td>
                    <b>
                      {String(row.name ?? row.description ?? `Item ${i + 1}`)}
                    </b>
                  </td>
                  <td>
                    <span
                      className={`badge ${row.status === "PROJECTED" ? "projected" : ""}`}
                    >
                      {String(row.status ?? row.type ?? kind)}
                    </span>
                  </td>
                  <td>
                    {brl(
                      row.amount ??
                        row.balance ??
                        row.targetAmount ??
                        row.creditLimit ??
                        0,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !isLoading &&
          !error && <div className="empty">Nenhum registro encontrado.</div>
        )}
      </section>
    </>
  );
}
