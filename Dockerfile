# Usar Python como base (necessário para o RAG e CrewAI)
FROM python:3.11-slim

# Instalar Node.js e ferramentas de sistema
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências primeiro (otimiza o build)
COPY package*.json ./
COPY pyproject.toml ./

# Instalar dependências do Node e do Python
RUN npm install
RUN pip install --no-cache-dir .

# Copiar todo o resto do projeto
COPY . .

# Expor a porta que o sistema usa (ajustado para o seu projeto)
EXPOSE 5000

# Comando para iniciar o sistema
CMD ["npm", "run", "dev"]
