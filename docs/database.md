# Banco de dados

PostgreSQL 16 e Prisma. Valores monetários usam `Decimal(19,2)`. O ledger central é `Transaction`; o saldo operacional é `initialBalance` mais movimentações e `CashReserve` é a fonte canônica das reservas. Há constraints únicas para fatura por cartão/período, orçamento por categoria/período, número da parcela, ocorrência recorrente/data e nomes locais que não podem se repetir. Checks protegem valores, dias, períodos, origem exclusiva conta/cartão e direção de transferências. Índices cobrem usuário/data/status, categorias, vencimentos e auditoria.

Entidades: User, Account, CashReserve, CreditCard, CardBill, Category, Transaction, RecurringTransaction, InstallmentPlan, Installment, Person, PersonEntry, MonthlyBudget, FinancialGoal e AuditLog.
