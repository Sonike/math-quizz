# syntax=docker/dockerfile:1

# ---- Build stage: compile the Vite app to static files ----
FROM node:22-alpine AS build
WORKDIR /app

# Pin pnpm to the version that produced pnpm-lock.yaml
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Install deps first (cached as long as the manifests don't change)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build (runs `tsc --noEmit && vite build`)
COPY . .
RUN pnpm build

# ---- Serve stage: nginx serving the static build ----
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run sends traffic to 8080 by default
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
