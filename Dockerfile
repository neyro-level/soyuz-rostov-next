# syntax=docker/dockerfile:1.7

FROM node:24.21.0-bookworm-slim AS build

ENV CI=true \
	NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.28.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile --shamefully-hoist

COPY . .
RUN pnpm exec next build --webpack

FROM node:24.21.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
	COREPACK_HOME=/tmp/corepack \
	HOME=/tmp \
	NEXT_TELEMETRY_DISABLED=1 \
	HOSTNAME=0.0.0.0 \
	PORT=3000

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.28.2 --activate \
	&& groupadd --system --gid 1001 nodejs \
	&& useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app ./

USER nextjs
EXPOSE 3000

CMD ["pnpm", "start"]
