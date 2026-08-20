import { DomainError } from "../errors/domain.error";
import { Money } from "./money";

describe("Money", () => {
  it("normalizes monetary values without float arithmetic", () => {
    expect(Money.from("10.5").toString()).toBe("10.50");
    expect(Money.from("0.01").add(Money.from("0.02")).toString()).toBe("0.03");
  });

  it.each(["0", "-1", "10.001", "abc"])("rejects invalid value %s", (value) => {
    expect(() => Money.from(value)).toThrow(DomainError);
  });
});
