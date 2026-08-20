import { DomainError } from "../../shared/domain/errors/domain.error";
import { splitInstallmentAmounts } from "./installment-schedule";

describe("splitInstallmentAmounts", () => {
  it("puts a rounding difference in the last installment", () => {
    const amounts = splitInstallmentAmounts("3.65", "43.84", 12);

    expect(amounts).toHaveLength(12);
    expect(amounts.slice(0, -1)).toEqual(Array(11).fill("3.65"));
    expect(amounts.at(-1)).toBe("3.69");
  });

  it("derives the total when it is omitted", () => {
    expect(splitInstallmentAmounts("10", undefined, 3)).toEqual([
      "10.00",
      "10.00",
      "10.00",
    ]);
  });

  it("rejects a total that cannot cover the installments", () => {
    expect(() => splitInstallmentAmounts("10", "19.99", 3)).toThrow(
      DomainError,
    );
  });
});
