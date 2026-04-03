# Build stage
FROM node:20-alpine AS build-stage
WORKDIR /app
RUN apk add --no-cache git
# Use package.json from Core/ directory for build tools
COPY Core/package*.json ./
RUN npm install
# Copy actual app source from Core/
COPY Core/ .
# Copy .git so the changelog vite plugin can run git log during build
COPY .git /app/.git
RUN npm run build:prod

# Production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY Core/nginx.conf /etc/nginx/conf.d/default.conf

# Bundle PocketBase migrations & hooks (from repo root context)
COPY pb_migrations /pb_migrations_bundled
COPY pb_hooks /pb_hooks_bundled

# Add script to sync migrations to a shared volume
RUN printf "#!/bin/sh\n\
    if [ \"\$1\" = \"sync\" ]; then\n\
    echo '🚀 Syncing bundled migrations to relay volume...'\n\
    mkdir -p /relay/migrations /relay/hooks\n\
    cp -r /pb_migrations_bundled/* /relay/migrations/ 2>/dev/null || true\n\
    cp -r /pb_hooks_bundled/* /relay/hooks/ 2>/dev/null || true\n\
    echo '✅ Sync complete.'\n\
    exit 0\n\
    fi\n\
    exec nginx -g 'daemon off;'" > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
