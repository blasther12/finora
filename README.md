# Finora

<p align="center">
  <strong>Clareza para entender hoje. Projeções para decidir amanhã.</strong>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-2caf7d">
</p>

Finora é um gerenciador financeiro pessoal full-stack orientado a estado financeiro, orçamento e projeções — não apenas um CRUD de despesas. Compras no cartão consomem orçamento na data da compra; pagamentos de fatura e transferências movimentam caixa sem duplicar receitas ou despesas.

## ✨ Destaques

- Dashboard responsivo com temas claro, escuro e do sistema.
- Contas, reservas, cartões, faturas e transações em um único lugar.
- Orçamentos consumidos na data da compra, inclusive no cartão.
- Projeções financeiras com gráficos para seis e doze meses.
- Recorrências idempotentes, parcelamentos, pessoas e metas.
- Precisão monetária com `Decimal(19,2)` e Value Object `Money`.
- API Swagger, seed seguro, migrations, testes e containers com health checks.

## 🧭 Visão do produto

```text
Dados financeiros → Estado financeiro → Orçamento → Projeções
                  → Simulações → Tomada de decisão → futura camada de IA
```

## 🚀 Início rápido com Docker

```bash
cp .env.example .env
docker compose up --build
```

Acesse:

| Serviço      | Endereço                         |
| ------------ | -------------------------------- |
| Aplicação    | <http://localhost:3000>          |
| Swagger      | <http://localhost:3001/api/docs> |
| Health check | <http://localhost:3001/health>   |

MongoDB é opcional: `docker compose --profile mongo up --build`.

## 🛠️ Desenvolvimento local

Pré-requisitos: Node 22, pnpm 10 e PostgreSQL 16.

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
NODE_ENV=development pnpm db:seed
pnpm dev
```

Comandos principais: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm format:check`, `pnpm audit:prod`, `pnpm build`, `pnpm format`, `pnpm db:studio`, `pnpm docker:down`.

## 🏗️ Arquitetura

O workspace pnpm contém Next.js em `apps/web`, NestJS/Prisma em `apps/api` e contratos reutilizáveis em `packages/shared`. A API é um monólito modular organizado por serviços de domínio. PostgreSQL é a única fonte de verdade financeira; Mongo é reservado a uma futura camada documental/IA.

As operações de transferência e pagamento de fatura usam transações de banco. Dinheiro usa `Decimal(19,2)`. Saldos operacionais são derivados do saldo inicial e do ledger; reservas usam `CashReserve` como fonte canônica. Gastos de orçamento são derivados de transações. Projeções mantêm confirmado e projetado separados. O período corrente é calculado automaticamente pela API no fuso `FINORA_TIME_ZONE`. Consulte [arquitetura](docs/architecture.md), [domínio](docs/domain.md), [banco](docs/database.md) e [API](docs/api.md).

## 📁 Estrutura

```text
apps/api       NestJS, Prisma, Swagger, Jest
apps/web       Next.js App Router, React Query, interface responsiva
packages/shared contratos e validação compartilhada
docs           decisões de arquitetura e domínio
.github        pipeline de CI
```

## ✅ Qualidade e releases

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Todo push resultante de merge na `main` executa a pipeline de validação. Quando ela termina com sucesso, o workflow de release cria automaticamente uma nova versão patch e uma GitHub Release com notas geradas a partir dos commits.

O seed idempotente usa somente identidades e instituições demonstrativas e só executa em desenvolvimento ou com `ALLOW_DEMO_SEED=true`. A autenticação fica preparada pelo `userId`; o MVP usa um usuário local fixo. Web e API são publicados apenas em `127.0.0.1`; PostgreSQL permanece acessível somente pela rede interna do Compose.

## 🔐 Segurança

- `.env`, chaves, logs e artefatos locais não são versionados nem enviados ao contexto Docker.
- Credenciais são fornecidas por variáveis de ambiente.
- Nenhum dado financeiro real é incluído no seed.
- Antes de publicar, execute uma ferramenta de secret scanning e revise o diff.

## 📚 Documentação

- [Arquitetura](docs/architecture.md)
- [Domínio financeiro](docs/domain.md)
- [Banco de dados](docs/database.md)
- [API](docs/api.md)

## 📄 Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
