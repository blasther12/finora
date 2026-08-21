# API

Prefixo funcional: `/api/v1`. Swagger com os schemas validados dos DTOs é gerado em `/api/docs`.

Principais rotas: `GET /dashboard`, CRUD inicial de `/accounts`, `/credit-cards`, `/transactions`, `/budgets`, `/people`, `/goals`; detalhes de cartão, fatura e extrato de pessoa; `POST /transfers`; `POST /credit-cards/:cardId/bills/:billId/pay`; `POST /recurring/generate/:year/:month`; `POST /installments`; `GET /projections/:year/:month`; `POST /projections/simulate`; `GET /financial-context`. Listagens usam envelope `{ data, meta }`; `/transactions` aceita paginação, busca, tipo, status e ordenação.

Sem `year` e `month`, `GET /dashboard` e `GET /budgets/current` usam automaticamente o mês civil no fuso definido por `FINORA_TIME_ZONE` (padrão `America/Sao_Paulo`). `GET /reference-period` expõe essa referência no formato `AAAA-MM`; a interface a renova a cada minuto e usa o mesmo valor para orçamento e projeções, inclusive quando permanece aberta durante a virada do mês.

O `ValidationPipe` rejeita campos desconhecidos e entradas inválidas. Recursos relacionados são conferidos contra o usuário local antes da gravação. O CORS aceita apenas `FINORA_WEB_ORIGIN` (uma ou mais origens separadas por vírgula).
