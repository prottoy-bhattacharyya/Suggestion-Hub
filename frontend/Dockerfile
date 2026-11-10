# Frontend (Vite dev server, TanStack Start) — dev image, deps first
FROM node:22-slim

WORKDIR /app

# 1) lockfile only -> dependency layer is cached
COPY package.json package-lock.json ./
RUN npm ci

# 2) code — bind-mounted in dev, but keep a copy for clean image runs
COPY . .

EXPOSE 8081

# -s = silent: delegate to Vite CLI so --host binds 0.0.0.0 inside the container
CMD ["npm", "run", "-s", "dev", "--", "--host", "0.0.0.0", "--port", "8081"]
