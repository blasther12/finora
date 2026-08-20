import { DomainError } from "../errors/domain.error";

/**
 * Value Object do domínio financeiro.
 *
 * Mantém a precisão em centavos sem depender do Prisma e concentra as
 * invariantes de valores monetários antes de chegar à persistência.
 */
export class Money {
  private constructor(private readonly cents: bigint) {}

  static from(value: string | number): Money {
    const normalized = String(value).trim();
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

    if (!match) {
      throw new DomainError(
        "Money must be a positive decimal with at most two decimal places",
      );
    }

    const fraction = (match[2] ?? "").padEnd(2, "0");
    const cents = BigInt(match[1]) * 100n + BigInt(fraction || "0");

    if (cents <= 0n) {
      throw new DomainError("Money must be greater than zero");
    }

    return new Money(cents);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    const result = this.cents - other.cents;
    if (result <= 0n)
      throw new DomainError("Money subtraction must remain greater than zero");
    return new Money(result);
  }

  multiply(multiplier: number): Money {
    if (!Number.isSafeInteger(multiplier) || multiplier <= 0)
      throw new DomainError("Money multiplier must be a positive integer");
    return new Money(this.cents * BigInt(multiplier));
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toString(): string {
    const units = this.cents / 100n;
    const fraction = String(this.cents % 100n).padStart(2, "0");
    return `${units}.${fraction}`;
  }
}
