import { currentReferencePeriod } from "./reference-period";

describe("currentReferencePeriod", () => {
  it("uses the configured financial timezone at a month boundary", () => {
    expect(
      currentReferencePeriod(
        new Date("2026-09-01T01:00:00.000Z"),
        "America/Sao_Paulo",
      ),
    ).toEqual({ year: 2026, month: 8, value: "2026-08" });
  });
});
