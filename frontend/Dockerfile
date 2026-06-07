# ── Frontend Dockerfile ───────────────────────────────────────────────────────
#
# Stage 1 (build): install all deps + run `npm run build` → static files
# Stage 2 (serve): nginx serves the static build (no Node.js needed)
#
# Result: ~20MB final image vs ~600MB if we kept Node.js

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
COPY public ./public
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# ── Serve with nginx ──────────────────────────────────────────────────────────
FROM nginx:alpine AS runner
COPY --from=build /app/build /usr/share/nginx/html

# nginx config for SPA (all routes → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
