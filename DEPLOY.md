# AW139 Smart Troubleshooting Assistant - VPS Deployment Guide

> **CRITICAL**: This is an EXPORT-ONLY deployment. DO NOT modify code, refactor, or change dependencies.
> The system works exactly as configured in Replit.

---

## 1. PROJECT STRUCTURE IDENTIFICATION

### 1.1 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Frontend** | React + Vite + TailwindCSS | React 18.3, Vite 5.4 |
| **Backend** | Express.js + TypeScript | Express 4.21, TS 5.6 |
| **ORM** | Drizzle ORM | 0.39 |
| **Database** | PostgreSQL (Neon Serverless) | External |
| **AI** | OpenAI GPT-4 + Embeddings | API |
| **Python Services** | FastAPI + CrewAI | Python 3.11 |
| **Runtime** | Node.js | 20.x |

### 1.2 Entry Points

| Service | Entry Point | Port |
|---------|-------------|------|
| **Development** | `server/index-dev.ts` | 5000 |
| **Production** | `server/index-prod.ts` → `dist/index.js` | 5000 |
| **RAG API** | `rag_api.py` | 8000 (internal) |
| **CrewAI** | `crew_server.py` | 9000 (internal) |

### 1.3 Frontend ↔ Backend Communication

- Frontend and backend run on **same origin** (port 5000)
- API calls use relative paths: `/api/*`
- No CORS configuration needed
- Vite proxies `/api` to Express in development
- In production, Express serves static files from `dist/public/`

---

## 2. FOLDER STRUCTURE

```
aw139-diagnostics-platform/
├── client/                     # React Frontend (Vite)
│   ├── index.html              # HTML entry point
│   ├── public/                 # Static assets
│   └── src/
│       ├── App.tsx             # Main React app
│       ├── main.tsx            # React entry
│       ├── index.css           # TailwindCSS styles
│       ├── pages/              # Route pages (Dashboard, History, etc.)
│       ├── components/         # UI components (Shadcn/ui)
│       ├── hooks/              # Custom React hooks
│       └── lib/                # Utilities
├── server/                     # Express Backend
│   ├── index-dev.ts            # Development entry
│   ├── index-prod.ts           # Production entry
│   ├── app.ts                  # Express app setup
│   ├── routes.ts               # API routes
│   ├── diagnostic-engine.ts    # AI diagnostic logic
│   ├── replitAuth.ts           # Authentication (with fallback)
│   ├── configuration-resolver.ts # Aircraft config lookup
│   └── storage.ts              # In-memory storage interface
├── shared/                     # Shared TypeScript
│   └── schema.ts               # Drizzle ORM schema + Zod types
├── db/                         # Database connection
│   └── index.ts                # PostgreSQL connection (with retry)
├── rag_api.py                  # Python RAG service (FastAPI)
├── crew_server.py              # Python CrewAI agents (FastAPI)
├── embeddings.json             # Vector embeddings (~497MB) ⚠️ NOT IN GIT
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose config
├── package.json                # Node.js dependencies
├── pyproject.toml              # Python dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.ts          # Tailwind configuration
├── drizzle.config.ts           # Drizzle ORM configuration
├── tsconfig.json               # TypeScript configuration
└── .env.example                # Environment variables template
```

---

## 3. ENVIRONMENT VARIABLES

### 3.1 Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `SESSION_SECRET` | Express session secret (32+ chars) | Generate with `openssl rand -hex 32` |

### 3.2 Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` for deploy |
| `PORT` | `5000` | Main server port |
| `RAG_API_PORT` | `8000` | RAG service port (internal) |
| `CREW_API_PORT` | `9000` | CrewAI service port (internal) |
| `RAG_API_URL` | `http://127.0.0.1:8000` | RAG service URL |
| `CREWAI_URL` | `http://127.0.0.1:9000` | CrewAI service URL |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |

### 3.3 .env File Template

```bash
# === REQUIRED ===
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require
OPENAI_API_KEY=sk-your-key-here
SESSION_SECRET=your-32-char-random-string-here

# === OPTIONAL ===
RAG_API_URL=http://127.0.0.1:8000
CREWAI_URL=http://127.0.0.1:9000
```

---

## 4. DATABASE & PERSISTENCE

### 4.1 Database

- **Type**: PostgreSQL (Neon Serverless)
- **Location**: External cloud service
- **Connection**: Via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM
- **Schema**: `shared/schema.ts`

### 4.2 Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts and quotas |
| `diagnosticQueries` | Diagnostic query history |
| `experts` | Expert roster for consultations |
| `dmcTools` | DMC wiring tool reference |
| `aircraftConfigurations` | Aircraft config codes (SN/LN/ENH/PLUS) |
| `serialEffectivity` | Serial number to config mapping |
| `partEffectivity` | Part applicability by config |

### 4.3 Critical Data Files

| File | Size | Location | In Git? |
|------|------|----------|---------|
| `embeddings.json` | 497 MB | Project root | ❌ NO |
| `pdf_data/` | 351 MB | Project root | ❌ NO |
| `xml_data/` | Variable | Project root | ❌ NO |

**⚠️ IMPORTANT**: `embeddings.json` must be transferred separately to VPS.

---

## 5. BUILD & RUN COMMANDS

### 5.1 Development (Replit)

```bash
# Start development server (all services)
npm run dev
```

This runs:
- Express server with Vite middleware (port 5000)
- Auto-spawns RAG API (port 8000)
- Auto-spawns CrewAI server (port 9000)

### 5.2 Production Build

```bash
# Install dependencies
npm ci --include=dev

# Build frontend (Vite) + backend (esbuild)
npm run build
```

**Output**:
- `dist/index.js` - Compiled backend
- `dist/public/` - Built frontend assets

### 5.3 Production Run

```bash
# Start production server
npm start
# Or: NODE_ENV=production node dist/index.js
```

### 5.4 Database Migrations

```bash
# Push schema to database
npm run db:push
```

---

## 6. DOCKER DEPLOYMENT

### 6.1 Dockerfile (already in repo)

Multi-stage build:
1. **Stage 1 (builder)**: Node.js build with devDependencies
2. **Stage 2 (production)**: Minimal runtime with Node.js + Python

### 6.2 Docker Commands

```bash
# Build image
docker compose build --no-cache

# Start container
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### 6.3 Health Check

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","services":{"database":"...","rag":"...","crewai":"..."}}
```

---

## 7. NETWORKING

### 7.1 Ports

| Port | Service | Exposed? |
|------|---------|----------|
| 5000 | Express (frontend + API) | ✅ YES |
| 8000 | RAG API (FastAPI) | ❌ Internal only |
| 9000 | CrewAI (FastAPI) | ❌ Internal only |

### 7.2 Cloudflare Configuration

| Setting | Value |
|---------|-------|
| DNS Record | A → VPS IP (Proxied ✅) |
| SSL Mode | Full (strict) |
| Always HTTPS | ON |
| Minimum TLS | 1.2 |

### 7.3 VPS Firewall

```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Cloudflare)
ufw allow 443/tcp  # HTTPS (Cloudflare)
ufw enable
```

---

## 8. STARTUP SEQUENCE

### 8.1 Service Boot Order

1. **Node.js Express server** starts on port 5000
2. Express spawns **RAG API** (Python) on port 8000
3. Express spawns **CrewAI** (Python) on port 9000
4. Express connects to **PostgreSQL** (Neon)
5. Health check available at `/api/health`

### 8.2 Startup Time

- Express: ~5 seconds
- Python services: ~30-60 seconds (loading embeddings)
- Total: ~60 seconds before fully operational

### 8.3 Pre-start Tasks

1. Ensure `embeddings.json` exists in project root
2. Ensure `.env` file configured
3. Database schema pushed (`npm run db:push`)

---

## 9. RESOURCE REQUIREMENTS

### 9.1 Memory

| Component | RAM |
|-----------|-----|
| Node.js Express | ~200 MB |
| RAG API (embeddings) | ~1.5 GB |
| CrewAI | ~300 MB |
| **Total** | **~2 GB minimum** |

**Recommended**: 4 GB RAM

### 9.2 CPU

- Idle: Low usage
- During queries: Moderate spikes
- **Recommended**: 2+ vCPUs

### 9.3 Disk

| Item | Size |
|------|------|
| Application code | ~50 MB |
| Node modules | ~500 MB |
| Python packages | ~200 MB |
| embeddings.json | ~500 MB |
| **Total** | **~1.5 GB minimum** |

---

## 10. VPS DEPLOYMENT STEPS

### Step 1: Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Create directory structure

```bash
mkdir -p /opt/aw139
cd /opt/aw139
```

### Step 3: Clone repository

```bash
git clone https://github.com/fariasvn/aw139-diagnostics-platform.git app
cd app
```

### Step 4: Transfer embeddings.json

```bash
# From local machine:
scp embeddings.json root@YOUR_VPS_IP:/opt/aw139/app/
```

### Step 5: Create .env file

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require
OPENAI_API_KEY=sk-your-key
SESSION_SECRET=$(openssl rand -hex 32)
EOF
```

### Step 6: Build and deploy

```bash
docker compose build --no-cache
docker compose up -d
```

### Step 7: Verify

```bash
# Check container status
docker compose ps

# Check health
curl http://localhost:5000/api/health

# View logs
docker compose logs -f
```

---

## 11. TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Container won't start | Check `docker compose logs` |
| Health check fails | Wait 60s for Python to initialize |
| Database connection error | Verify `DATABASE_URL` in `.env` |
| Missing embeddings | Transfer `embeddings.json` to project root |
| Frontend 404 | Ensure `npm run build` completed |
| Python not starting | Check Python packages installed |

---

## 12. UPDATE PROCEDURE

```bash
cd /opt/aw139/app
git pull origin main
docker compose up --build -d
```

---

## 13. BACKUP STRATEGY

- **Database**: Managed by Neon (automatic)
- **embeddings.json**: Manual backup recommended
- **Application**: Version controlled in Git

---

**Last Updated**: January 2025
**Version**: 1.0.0
