# Stage 1: Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-bookworm-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python
RUN pip3 install --break-system-packages --no-cache-dir \
    fastapi==0.109.0 uvicorn==0.27.0 pydantic==2.5.3 requests==2.31.0
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY shared ./shared
COPY server ./server
COPY rag_api.py ./
COPY crew_server.py ./
COPY embeddings.json ./
COPY drizzle.config.ts ./
COPY migrations ./migrations
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 5000 8000 9000
ENV NODE_ENV=production
ENV PORT=5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1
CMD ["node", "dist/index.js"]
