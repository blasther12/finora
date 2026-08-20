import { Injectable } from "@nestjs/common";
import { addMonthsUtc, dateAtUtc } from "../../../shared/domain/date/utc-date";

export interface ResolveBillInput {
  transactionDate: Date;
  closingDay: number;
  dueDay: number;
}

export interface BillingCycle {
  referenceYear: number;
  referenceMonth: number;
  closingDate: Date;
  dueDate: Date;
}

@Injectable()
export class CardBillingCycleService {
  resolveBill(input: ResolveBillInput): BillingCycle {
    const year = input.transactionDate.getUTCFullYear();
    const month = input.transactionDate.getUTCMonth() + 1;
    const closingDate = dateAtUtc(year, month, input.closingDay);
    const referenceDate =
      input.transactionDate.getUTCDate() < closingDate.getUTCDate()
        ? new Date(Date.UTC(year, month - 1, 1))
        : addMonthsUtc(new Date(Date.UTC(year, month - 1, 1)), 1);
    const referenceYear = referenceDate.getUTCFullYear();
    const referenceMonth = referenceDate.getUTCMonth() + 1;
    const dueCandidate = dateAtUtc(referenceYear, referenceMonth, input.dueDay);
    const dueDate =
      dueCandidate <= closingDate
        ? dateAtUtc(
            referenceMonth === 12 ? referenceYear + 1 : referenceYear,
            referenceMonth === 12 ? 1 : referenceMonth + 1,
            input.dueDay,
          )
        : dueCandidate;

    return { referenceYear, referenceMonth, closingDate, dueDate };
  }
}
