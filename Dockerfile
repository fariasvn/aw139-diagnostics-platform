# Step 1: Base
FROM python:3.11-slim

# Step 2: Instalar ferramentas
RUN apt-get update && apt-get install -y \
    curl wget unzip \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Step 4: Download e extração
RUN wget https://github.com/fariasvn/aw139-diagnostics-platform/archive/refs/heads/main.zip -O project.zip \
    && unzip project.zip \
    && cp -R aw139-diagnostics-platform-main/. . \
    && rm -rf aw139-diagnostics-platform-main project.zip

# Step 4.5: CRIAR O VITE.CONFIG QUE ESTÁ FALTANDO
RUN echo "import { defineConfig } from 'vite';\nimport path from 'path';\nexport default defineConfig({\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './client/src'),\n    },\n  },\n  server: {\n    host: '0.0.0.0',\n    port: 3000,\n  },\n});" > vite.config.ts

# Step 5: Instalar dependências
RUN npm install

# Step 6: Python
RUN pip install --no-cache-dir crewai langchain-openai flask flask-cors python-dotenv

# Step 7 e 8: Portas e Comando
EXPOSE 3000
EXPOSE 5000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
