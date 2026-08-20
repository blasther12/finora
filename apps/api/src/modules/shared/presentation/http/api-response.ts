export interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
}

export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "object" && item?.constructor?.name === "Decimal"
        ? item.toString()
        : item,
    ),
  ) as T;
}

export async function respond<T>(
  value: Promise<T> | T,
  meta: Record<string, unknown> = {},
): Promise<ApiEnvelope<T>> {
  return { data: serialize(await value), meta };
}
