const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Não foi possível carregar os dados");
  return (await r.json()).data;
}
export const brl = (value: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );
