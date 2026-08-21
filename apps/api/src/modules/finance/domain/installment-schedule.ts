import { DomainError } from "../../shared/domain/errors/domain.error";
import { Money } from "../../shared/domain/value-objects/money";

export function splitInstallmentAmounts(
  installmentAmount: string,
  totalAmount: string | undefined,
  totalInstallments: number,
): string[] {
  if (!Number.isSafeInteger(totalInstallments) || totalInstallments <= 0)
    throw new DomainError("Installment count must be a positive integer");

  const base = Money.from(installmentAmount);
  const total = totalAmount
    ? Money.from(totalAmount)
    : base.multiply(totalInstallments);
  const last =
    totalInstallments === 1
      ? total
      : total.subtract(base.multiply(totalInstallments - 1));

  return Array.from({ length: totalInstallments }, (_, index) =>
    index === totalInstallments - 1 ? last.toString() : base.toString(),
  );
}
