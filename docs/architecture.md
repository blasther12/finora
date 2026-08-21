# Arquitetura

O Finora é um monólito modular: presentation (controllers HTTP), application/domain (serviços financeiros) e infrastructure (Prisma/PostgreSQL). Controllers apenas adaptam entrada e saída. `FinanceService` concentra ledger, cartão, transferência e pagamento; `AnalyticsService` deriva orçamento, projeção e dashboard; `CardBillingCycleService` isola calendário do cartão.

## Organização da API

```text
src/
├── app.module.ts
├── main.ts
└── modules/
    ├── api/
    │   └── presentation/http/
    ├── analytics/
    │   └── application/services/
    ├── credit-cards/
    │   └── domain/services/
    ├── finance/
    │   └── application/services/
    └── shared/
        ├── application/
        ├── domain/
        ├── infrastructure/database/
        └── presentation/http/
```

- **Domain** contém regras puras, invariantes, Value Objects e serviços de domínio.
- **Application** coordena casos de uso e transações sem conhecer HTTP.
- **Infrastructure** implementa acesso ao PostgreSQL e detalhes externos.
- **Presentation** adapta HTTP, parâmetros e envelopes de resposta.
- Os arquivos `*.module.ts` são os limites de composição e injeção do NestJS.

Operações críticas usam `Prisma.$transaction`. A API retorna `{ data, meta }`. O Next.js não calcula regras financeiras e usa React Query como camada de servidor. O mês de referência é calculado na API com `FINORA_TIME_ZONE` e devolvido ao frontend, evitando divergência entre relógios do navegador e servidor. Datas civis financeiras são persistidas como `date` e construídas em UTC; exibição usa `pt-BR` com UTC explícito.

Como prática de DDD, valores monetários recebidos pelos casos de uso passam pelo Value Object `Money`. Ele é imutável, valida as invariantes do domínio, opera internamente em centavos com `bigint` e não depende do Prisma. A conversão para `Decimal` acontece somente na fronteira de persistência.
