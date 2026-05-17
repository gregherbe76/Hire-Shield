## HireShield production image
## Builds the API server and the frontend in one image, served on a single port.

# ---- Base ---------------------------------------------------------------
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- Dependencies -------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/hireshield/package.json artifacts/hireshield/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/
COPY lib/ lib/
COPY scripts/package.json scripts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build --------------------------------------------------------------
FROM deps AS build
COPY . .
ENV NODE_ENV=production
ENV BASE_PATH=/
ENV PORT=8080
RUN pnpm --filter @workspace/api-spec run codegen \
 && pnpm --filter @workspace/api-server run build \
 && pnpm --filter @workspace/hireshield run build

# ---- Runtime ------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/public
ENV SERVE_STATIC=1

# Copy only what's needed to run
COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/artifacts/hireshield/dist/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=build /app/lib ./lib

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:8080/api/healthz >/dev/null || exit 1

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
