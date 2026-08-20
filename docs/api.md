# API

Prefixo funcional: `/api/v1`. Swagger completo é gerado em `/api/docs`.

Principais rotas: `GET /dashboard`, CRUD inicial de `/accounts`, `/credit-cards`, `/transactions`, `/budgets`, `/people`, `/goals`; `POST /transfers`; `POST /credit-cards/:cardId/bills/:billId/pay`; `POST /recurring/generate/:year/:month`; `GET /projections/:year/:month`; `POST /projections/simulate`; `GET /financial-context`. Listagens usam envelope `{ data, meta }`; `/transactions` aceita paginação, busca, tipo, status e ordenação.
