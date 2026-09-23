# Flipbook web app. Build from the repository root:
#   docker build -t flipbook-app \
#     --build-arg NEXT_PUBLIC_APP_URL=https://flipbook.co \
#     --build-arg NEXT_PUBLIC_PADDLE_ENV=production \
#     --build-arg NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_xxx .
#
# The three NEXT_PUBLIC_* values are baked into the browser bundle by `next build`, so they
# are build arguments, not runtime environment. Passing them at run time does nothing and
# ships share links pointing at localhost — quietly, which is the dangerous part.
#
# This image does NOT apply migrations. Build the `migrate` stage for that; see README > Deploy.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
# prisma.config.ts wants a URL even though generate never connects.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

FROM deps AS build
WORKDIR /app
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PADDLE_ENV=production
ARG NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
# Opt into the traced standalone output; see next.config.ts.
ENV NEXT_OUTPUT=standalone \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_PADDLE_ENV=$NEXT_PUBLIC_PADDLE_ENV \
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=$NEXT_PUBLIC_PADDLE_CLIENT_TOKEN \
    NEXT_TELEMETRY_DISABLED=1
# .dockerignore keeps node_modules, .next, src/generated and every .env out of this.
COPY . .
# src/lib/db builds the Prisma client as its module loads and throws without a URL, so a
# prerendered route that imports it would fail the build. Nothing connects; the value is a stub.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# The traced standalone output carries its own minimal node_modules.
COPY --from=build /app/.next/standalone ./
# Standalone never carries .next/static. It does carry `public` today, but that is copied
# again on purpose: src/lib/og/image.tsx reads the brand serif from disk and falls back to a
# default font without complaining, so losing it would show up as ugly link previews rather
# than as an error.
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

# Applies pending migrations, then exits. Run it before deploying a build that adds one:
#   docker build --target migrate -t flipbook-migrate .
#   docker run --rm --env-file .env.production flipbook-migrate
# It keeps the full node_modules because the Prisma CLI reads prisma.config.ts through c12,
# whose loader is a hoisted dependency — the CLI does not survive being copied out piecemeal.
FROM deps AS migrate
WORKDIR /app
CMD ["npx", "prisma", "migrate", "deploy"]
