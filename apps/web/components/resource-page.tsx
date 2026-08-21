"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiEnvelope, brl } from "@/lib/api";

type Format =
  "badge" | "currency" | "date" | "number" | "percent" | "period" | "text";
type Column = { label: string; field: string; format?: Format };
export type ResourceKind =
  | "accounts"
  | "budgets"
  | "cards"
  | "goals"
  | "installments"
  | "people"
  | "recurring"
  | "transactions";

const columns: Record<ResourceKind, Column[]> = {
  accounts: [
    { label: "Conta", field: "name" },
    { label: "Instituição", field: "institution" },
    { label: "Tipo", field: "type", format: "badge" },
    { label: "Saldo", field: "balance", format: "currency" },
    { label: "Reservas detalhadas", field: "reserve", format: "currency" },
  ],
  transactions: [
    { label: "Descrição", field: "description" },
    { label: "Data", field: "transactionDate", format: "date" },
    { label: "Categoria", field: "category.name" },
    { label: "Conta / cartão", field: "account.name|creditCard.name" },
    { label: "Tipo", field: "type", format: "badge" },
    { label: "Status", field: "status", format: "badge" },
    { label: "Valor", field: "amount", format: "currency" },
  ],
  cards: [
    { label: "Cartão", field: "name" },
    { label: "Instituição", field: "institution" },
    { label: "Fechamento", field: "closingDay", format: "number" },
    { label: "Vencimento", field: "dueDay", format: "number" },
    { label: "Limite", field: "creditLimit", format: "currency" },
    { label: "Última fatura", field: "latestBillAmount", format: "currency" },
    { label: "Status", field: "latestBillStatus", format: "badge" },
  ],
  recurring: [
    { label: "Descrição", field: "description" },
    { label: "Categoria", field: "category.name" },
    { label: "Conta / cartão", field: "account.name|creditCard.name" },
    { label: "Frequência", field: "frequency", format: "badge" },
    { label: "Dia", field: "dayOfMonth", format: "number" },
    { label: "Valor", field: "amount", format: "currency" },
    { label: "Situação", field: "active", format: "badge" },
  ],
  installments: [
    { label: "Descrição", field: "description" },
    { label: "Categoria", field: "category.name" },
    { label: "Conta / cartão", field: "account.name|creditCard.name" },
    { label: "Progresso", field: "paidInstallments/totalInstallments" },
    { label: "Próximo vencimento", field: "nextDueDate", format: "date" },
    { label: "Parcela", field: "installmentAmount", format: "currency" },
    { label: "Total", field: "totalAmount", format: "currency" },
  ],
  people: [
    { label: "Pessoa", field: "name" },
    { label: "Lançamentos pendentes", field: "entryCount", format: "number" },
    { label: "A receber", field: "receivable", format: "currency" },
    { label: "A pagar", field: "payable", format: "currency" },
    { label: "Saldo líquido", field: "netBalance", format: "currency" },
  ],
  budgets: [
    { label: "Referência", field: "period", format: "period" },
    { label: "Categoria", field: "category" },
    { label: "Limite", field: "limit", format: "currency" },
    { label: "Gasto", field: "spent", format: "currency" },
    { label: "Restante", field: "remaining", format: "currency" },
    { label: "Uso", field: "usagePercentage", format: "percent" },
  ],
  goals: [
    { label: "Meta", field: "name" },
    { label: "Tipo", field: "type", format: "badge" },
    { label: "Status", field: "status", format: "badge" },
    { label: "Atual", field: "currentAmount", format: "currency" },
    { label: "Objetivo", field: "targetAmount", format: "currency" },
    { label: "Prazo", field: "targetDate", format: "date" },
  ],
};

function nestedValue(row: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, row);
}

function valueFor(row: Record<string, unknown>, field: string): unknown {
  if (field.includes("|")) {
    for (const option of field.split("|")) {
      const value = nestedValue(row, option);
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return "—";
  }
  if (field === "paidInstallments/totalInstallments") {
    return `${row.paidInstallments ?? 0}/${row.totalInstallments ?? 0}`;
  }
  return nestedValue(row, field);
}

function display(value: unknown, format: Format = "text") {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "currency") return brl(value);
  if (format === "date")
    return new Date(String(value)).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    });
  if (format === "percent") return `${Number(value).toFixed(2)}%`;
  if (format === "period") {
    const [year, month] = String(value).split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  if (format === "badge" && typeof value === "boolean")
    return value ? "ATIVO" : "INATIVO";
  return String(value).replaceAll("_", " ");
}

export function ResourcePage({
  title,
  path,
  resource,
  paginated = false,
  detailPath,
  refreshIntervalMs,
}: {
  title: string;
  path: string;
  resource: ResourceKind;
  paginated?: boolean;
  detailPath?: string;
  refreshIntervalMs?: number;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const separator = path.includes("?") ? "&" : "?";
  const requestPath = paginated
    ? `${path}${separator}page=${page}&limit=${pageSize}`
    : path;
  const {
    data: response,
    error,
    isLoading,
  } = useQuery({
    queryKey: [path, page, paginated],
    queryFn: () =>
      apiEnvelope<Record<string, unknown>[] | Record<string, unknown>>(
        requestPath,
      ),
    refetchInterval: refreshIntervalMs,
    refetchIntervalInBackground: Boolean(refreshIntervalMs),
  });
  const data = response
    ? Array.isArray(response.data)
      ? response.data
      : [response.data]
    : undefined;
  const total = Number(response?.meta.total ?? data?.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedColumns = columns[resource];

  return (
    <>
      <header className="top">
        <div>
          <div className="label">Finora</div>
          <h1>{title}</h1>
        </div>
      </header>
      <section className="card resource-card">
        {isLoading && <div className="empty">Carregando…</div>}
        {error && (
          <div className="empty">Não foi possível consultar a API.</div>
        )}
        {data?.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  {selectedColumns.map((column) => (
                    <th key={column.field}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={String(row.id ?? `${resource}-${index}`)}>
                    {selectedColumns.map((column, columnIndex) => {
                      const raw = valueFor(row, column.field);
                      const rendered = display(raw, column.format);
                      return (
                        <td
                          key={column.field}
                          className={
                            column.format === "currency" ? "numeric" : ""
                          }
                        >
                          {column.format === "badge" ? (
                            <span
                              className={`badge ${raw === "PROJECTED" ? "projected" : ""}`}
                            >
                              {rendered}
                            </span>
                          ) : columnIndex === 0 ? (
                            detailPath && row.id ? (
                              <Link href={`${detailPath}/${String(row.id)}`}>
                                <b>{rendered}</b>
                              </Link>
                            ) : (
                              <b>{rendered}</b>
                            )
                          ) : (
                            rendered
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !isLoading &&
          !error && <div className="empty">Nenhum registro encontrado.</div>
        )}
      </section>
      {paginated && totalPages > 1 && (
        <nav className="pagination" aria-label="Paginação da tabela">
          <button
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            Anterior
          </button>
          <span>
            Página {page} de {totalPages} · {total} registros
          </span>
          <button
            className="btn btn-secondary"
            disabled={page === totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Próxima
          </button>
        </nav>
      )}
    </>
  );
}
