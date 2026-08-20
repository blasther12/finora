# Banco de dados

PostgreSQL 16 e Prisma. Valores monetários usam `Decimal(19,2)`. O ledger central é `Transaction`; saldo é `initialBalance` mais movimentações. Há constraints únicas para fatura por cartão/período, orçamento por categoria/período, número da parcela e ocorrência recorrente/data. Índices cobrem usuário/data/status, categorias, vencimentos e auditoria.

Entidades: User, Account, CashReserve, CreditCard, CardBill, Category, Transaction, RecurringTransaction, InstallmentPlan, Installment, Person, PersonEntry, MonthlyBudget, FinancialGoal e AuditLog.
