FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @finora/api... --frozen-lockfile=false
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @finora/api db:generate && pnpm --filter @finora/api build
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app
COPY --from=base /app ./
EXPOSE 3001
CMD ["sh","-c","pnpm --filter @finora/api db:migrate && pnpm --filter @finora/api db:seed && pnpm --filter @finora/api start"]
