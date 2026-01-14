# Stage 1: Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Dependências de sistema necessárias para compilar dependências nativas
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-bookworm-slim AS production
WORKDIR /app

# Instalação de pacotes de runtime e definição de Timezone
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    tzdata \
    && ln -fs /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Instalação das dependências de IA (Python)
RUN pip3 install --break-system-packages --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    pydantic==2.5.3 \
    requests==2.31.0 \
    crewai \
    langchain-openai

COPY package*.json ./
RUN npm ci --only=production

# Copia os artefatos compilados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Copia arquivos fonte necessários para o runtime
COPY shared ./shared
COPY server ./server
COPY rag_api.py ./
COPY crew_server.py ./
COPY drizzle.config.ts ./
COPY migrations ./migrations

# O asterisco permite que o build continue se o arquivo não existir no GitHub
COPY embeddings.json* ./

# Configuração de segurança e permissões
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app \
    && chmod +x rag_api.py crew_server.py

# Switch para usuário seguro
USER appuser

EXPOSE 5000 8000 9000

ENV NODE_ENV=production
ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
