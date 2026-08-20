ALTER TABLE "CashReserve"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Category"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Installment"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Person"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "FinancialGoal"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "CashReserve_accountId_name_key"
  ON "CashReserve"("accountId", "name");
CREATE UNIQUE INDEX "CreditCard_userId_name_key"
  ON "CreditCard"("userId", "name");
CREATE UNIQUE INDEX "Person_userId_name_key"
  ON "Person"("userId", "name");

ALTER TABLE "CashReserve"
  ADD CONSTRAINT "CashReserve_amounts_check"
  CHECK ("currentAmount" >= 0 AND ("targetAmount" IS NULL OR "targetAmount" > 0));

ALTER TABLE "CreditCard"
  ADD CONSTRAINT "CreditCard_days_check"
  CHECK ("closingDay" BETWEEN 1 AND 31 AND "dueDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "CreditCard_limit_check" CHECK ("creditLimit" >= 0);

ALTER TABLE "CardBill"
  ADD CONSTRAINT "CardBill_reference_month_check" CHECK ("referenceMonth" BETWEEN 1 AND 12),
  ADD CONSTRAINT "CardBill_amounts_check" CHECK ("currentAmount" >= 0 AND "projectedAmount" >= 0);

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "Transaction_source_check" CHECK (num_nonnulls("accountId", "creditCardId") = 1),
  ADD CONSTRAINT "Transaction_transfer_direction_check" CHECK (
    ("type" = 'TRANSFER' AND "transferDirection" IN (-1, 1)) OR
    ("type" <> 'TRANSFER' AND "transferDirection" IS NULL)
  );

ALTER TABLE "RecurringTransaction"
  ADD CONSTRAINT "RecurringTransaction_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "RecurringTransaction_day_check" CHECK ("dayOfMonth" BETWEEN 1 AND 31),
  ADD CONSTRAINT "RecurringTransaction_source_check" CHECK (num_nonnulls("accountId", "creditCardId") = 1),
  ADD CONSTRAINT "RecurringTransaction_type_check" CHECK ("type" IN ('EXPENSE', 'INCOME')),
  ADD CONSTRAINT "RecurringTransaction_dates_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

ALTER TABLE "InstallmentPlan"
  ADD CONSTRAINT "InstallmentPlan_amounts_check" CHECK (
    "installmentAmount" > 0 AND ("totalAmount" IS NULL OR "totalAmount" > 0)
  ),
  ADD CONSTRAINT "InstallmentPlan_count_check" CHECK ("totalInstallments" > 0),
  ADD CONSTRAINT "InstallmentPlan_source_check" CHECK (num_nonnulls("accountId", "creditCardId") = 1);

ALTER TABLE "Installment"
  ADD CONSTRAINT "Installment_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "Installment_number_check" CHECK ("number" > 0);

ALTER TABLE "PersonEntry"
  ADD CONSTRAINT "PersonEntry_amount_check" CHECK ("amount" > 0);

ALTER TABLE "MonthlyBudget"
  ADD CONSTRAINT "MonthlyBudget_period_check" CHECK ("month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "MonthlyBudget_amount_check" CHECK ("limitAmount" > 0);

ALTER TABLE "FinancialGoal"
  ADD CONSTRAINT "FinancialGoal_amounts_check" CHECK (
    "targetAmount" > 0 AND "currentAmount" >= 0
  );
