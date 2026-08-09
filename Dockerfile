# syntax=docker/dockerfile:1

# deps: install production and build dependencies from the lockfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# builder: produce the Next.js standalone output (.next/standalone, .next/static)
FROM node:22-alpine AS builder
WORKDIR /app
# VERSION is accepted so the image can be tagged/labelled with the release
# version; the app does not consume it yet.
ARG VERSION=0.0.0
ARG NEXT_PUBLIC_SITE_URL=https://blobflow.com
# Umami website id. Next inlines NEXT_PUBLIC_ values into the client bundle at
# build time, so an id supplied only at run time never reaches the browser and
# the tracker is never loaded. Empty (the default) ships no tracker at all.
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID=
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runner: minimal runtime image serving the standalone server
FROM node:22-alpine AS runner
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL=https://blobflow.com
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID=
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Run as a non-root user
RUN addgroup -g 1001 -S nodejs \
  && adduser -u 1001 -S nextjs -G nodejs

# The standalone output already bundles a trimmed node_modules and server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
