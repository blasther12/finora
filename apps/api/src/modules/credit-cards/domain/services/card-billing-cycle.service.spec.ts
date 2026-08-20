import { CardBillingCycleService } from "./card-billing-cycle.service";
describe("CardBillingCycleService", () => {
  const service = new CardBillingCycleService();
  it("puts purchases before closing in current bill and on/after closing in next bill", () => {
    expect(
      service.resolveBill({
        transactionDate: new Date("2026-08-06T12:00:00Z"),
        closingDay: 7,
        dueDay: 14,
      }).referenceMonth,
    ).toBe(8);
    expect(
      service.resolveBill({
        transactionDate: new Date("2026-08-07T12:00:00Z"),
        closingDay: 7,
        dueDay: 14,
      }).referenceMonth,
    ).toBe(9);
  });
  it.each([
    [2024, 2, 31, 29],
    [2026, 2, 31, 28],
    [2026, 4, 31, 30],
  ])("clamps invalid days", (year, month, closingDay, expected) => {
    expect(
      service
        .resolveBill({
          transactionDate: new Date(Date.UTC(year, month - 1, 1)),
          closingDay,
          dueDay: 31,
        })
        .closingDate.getUTCDate(),
    ).toBe(expected);
  });
});
