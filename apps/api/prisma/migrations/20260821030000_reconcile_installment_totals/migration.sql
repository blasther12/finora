-- Reconcile legacy plans created before installments were materialized in the ledger.
-- Decimal rounding is placed in the last installment so the sum matches totalAmount.
UPDATE "Installment" AS installment
SET
  amount = plan."totalAmount" - plan."installmentAmount" * (plan."totalInstallments" - 1),
  "updatedAt" = CURRENT_TIMESTAMP
FROM "InstallmentPlan" AS plan
WHERE
  installment."installmentPlanId" = plan.id
  AND installment.number = plan."totalInstallments"
  AND plan."totalAmount" IS NOT NULL
  AND plan."totalAmount" <> plan."installmentAmount" * plan."totalInstallments"
  AND plan."totalAmount" - plan."installmentAmount" * (plan."totalInstallments" - 1) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "Transaction" AS transaction
    JOIN "Installment" AS linked_installment
      ON linked_installment.id = transaction."installmentId"
    WHERE linked_installment."installmentPlanId" = plan.id
  );
