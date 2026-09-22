# Multi-stage build for Saúde Territorial.
# Produces a minimal production image using Next.js standalone output.

# ---------------------------------------------------------------------------
# Stage 1 — install dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# Alpine needs build tools for native deps (better-sqlite3).
RUN apk add --no-cache python3 make g++

# Install without build scripts (avoids pnpm's unapproved-builds error),
# then explicitly rebuild the native deps we need.
RUN pnpm install --ignore-scripts
RUN pnpm rebuild better-sqlite3 esbuild

# ---------------------------------------------------------------------------
# Stage 2 — build the application
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
RUN corepack enable

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DATABASE_URL placeholder so `next build` can compile without a live DB.
ENV DATABASE_URL="postgresql://placeholder@localhost:5432/placeholder"

RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 3 — production runner
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Don't run as root.
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone server + static assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Drizzle migrations + config needed at runtime for the entrypoint migration.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db

# Better Auth config needed by CLI migration + tsconfig for tsx imports.
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/auth.ts ./src/lib/auth.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# drizzle-kit + its deps for running migrations.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Writable directory for Better Auth SQLite (auth.db).
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Entrypoint: run migrations then start server.
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["./docker-entrypoint.sh"]
