FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN pnpm install --filter @finora/api... --frozen-lockfile
COPY apps/api apps/api
COPY packages/shared packages/shared
COPY packages/eslint-config packages/eslint-config
RUN pnpm --filter @finora/api db:generate \
  && pnpm --filter @finora/api build \
  && pnpm --filter @finora/api deploy --prod --legacy /prod/api \
  && cd /prod/api \
  && ./node_modules/.bin/prisma generate
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node --from=base /prod/api ./
USER node
EXPOSE 3001
CMD ["sh","-c","./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
