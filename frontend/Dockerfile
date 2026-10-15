# Stage 1: Build static assets with Node.js
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
# Install dependencies
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Runtime image with unprivileged Nginx (non-root)
FROM nginxinc/nginx-unprivileged:alpine-slim AS runner

WORKDIR /usr/share/nginx/html

# Copy built static files from builder stage
COPY --from=builder /app/dist .

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port 8080 is standard unprivileged port for nginx-unprivileged
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
