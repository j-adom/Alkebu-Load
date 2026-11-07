# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:26-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Match package.json packageManager; avoid unpinned package-manager upgrades.
RUN npm install -g pnpm@10.15.0

COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN pnpm i --frozen-lockfile


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Use the same pinned pnpm version for the build stage
RUN npm install -g pnpm@10.15.0
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Remove this line if you do not have this folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
# .next/cache is the only path the server writes to. In Coolify, run with a
# read-only root filesystem and mount tmpfs at /tmp and /app/.next/cache
# (see docs/vps-hardening.md).
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check. This is the production check, but only while Coolify's dashboard
# health check is Disabled: enabled, Coolify writes its own (timeout-less) check
# into the compose file and overrides this one. See docs/vps-hardening.md §3. `--max-time` matters: Coolify's generated check ran
# curl with no timeout, and when the server hung on 2026-11-07 every 10-second
# timeout left an orphaned curl behind (1,116 of them after 12 hours), which is
# what pushed the container to its 1 GiB memory cap. curl must exit on its own
# before Docker's timeout so a hung server produces failed checks, not leaks.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf --max-time 8 http://localhost:3000/api/health > /dev/null || exit 1

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
