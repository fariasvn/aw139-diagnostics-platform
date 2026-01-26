# ============================================================
# AW139 Smart Troubleshooting Assistant - Production Dockerfile
# Multi-stage build: Node.js 20 + Python 3.11
# ============================================================

# Stage 1: Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# IMPORTANTE: Garantir que NODE_ENV não está em production durante o build
ENV NODE_ENV=development

# Instalar Python para scripts de build
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar TODAS as dependências (dev + prod)
# --include=dev garante que devDependencies são instaladas
RUN npm ci --include=dev

# Copiar código fonte para build
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY db ./db
COPY attached_assets ./attached_assets
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./
COPY components.json ./

# Executar build de produção
RUN npm run build

# Verificar que assets foram gerados
RUN ls -la dist/public/assets/ || (echo "BUILD FAILED: assets not generated" && exit 1)

# ============================================================
# Stage 2: Production runtime
# ============================================================
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Definir NODE_ENV para produção
ENV NODE_ENV=production
ENV PORT=5000

# Instalar Python e curl para runtime
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Instalar pacotes Python para RAG e CrewAI
RUN pip3 install --break-system-packages --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    pydantic==2.5.3 \
    requests==2.31.0

# Copiar package.json
COPY package*.json ./

# Instalar APENAS dependências de produção
RUN npm ci --omit=dev

# Copiar build do stage anterior
COPY --from=builder /app/dist ./dist

# Copiar arquivos de runtime
COPY shared ./shared
COPY server ./server
COPY db ./db
COPY rag_api.py ./
COPY crew_server.py ./
COPY embeddings.json ./
COPY drizzle.config.ts ./
COPY migrations ./migrations

# Criar usuário não-root e ajustar permissões
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000 8000 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
