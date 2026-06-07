# ── Backend Dockerfile ────────────────────────────────────────────────────────
#
# Multi-stage build:
#   Stage 1 (deps): install only production dependencies
#   Stage 2 (runner): copy source + deps into lean final image
#
# Why multi-stage?
# - node_modules includes devDependencies (jest, nodemon) by default
# - Multi-stage lets us install all deps for build, then copy only prod deps
# - Final image is ~60% smaller (faster pulls, less attack surface)
#
# Best practices shown here (mention in interviews):
#   - Non-root USER for security
#   - NODE_ENV=production disables devDeps and enables Express optimizations
#   - .dockerignore prevents node_modules from being copied into context

FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

# ── Runner stage ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user (security best practice)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
