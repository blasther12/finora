export interface ReferencePeriod {
  year: number;
  month: number;
  value: string;
}

export function currentReferencePeriod(
  date = new Date(),
  timeZone = process.env.FINORA_TIME_ZONE ?? "America/Sao_Paulo",
): ReferencePeriod {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    timeZone,
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month, value: `${year}-${String(month).padStart(2, "0")}` };
}
