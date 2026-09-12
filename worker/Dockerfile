# PDF processing worker. Build from the repository root:
#   docker build -f worker/Dockerfile -t flipbook-worker .
# Run with the same DATABASE_URL, S3_* and email variables as the app, e.g.:
#   docker run --env-file .env.production --memory=1g flipbook-worker
# One worker handles WORKER_CONCURRENCY jobs at a time; scale out by running more containers
# (jobs are claimed with FOR UPDATE SKIP LOCKED, so workers never collide).

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
# prisma.config.ts wants a URL even though generate never connects.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# sharp and @napi-rs/canvas ship prebuilt binaries as optional dependencies; no build tools needed.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/src/generated ./src/generated
COPY tsconfig.json ./
COPY prisma/client.ts ./prisma/client.ts
COPY src/lib ./src/lib
COPY worker ./worker
USER node
CMD ["node", "--import", "tsx", "worker/index.ts"]
