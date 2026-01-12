# AW139 Smart Troubleshooting Assistant

AI-powered diagnostic system for AW139 helicopter maintenance featuring dual-pipeline RAG analysis (22,661 documents), 3-Agent CrewAI system, and automatic aircraft configuration resolution.

## Features

- **22,661 Documents Indexed**: XML maintenance manuals + PDF training materials
- **OpenAI Embeddings**: text-embedding-3-small for semantic search
- **GPT-4-Turbo Responses**: Level-D Maintenance Specialist formatting
- **3-Agent CrewAI System**: Primary Diagnostic → Cross-Check → Historical/Inventory
- **95% Certainty Threshold**: Safety-critical expert validation for uncertain diagnoses
- **Aircraft Configuration Resolution**: Auto-detect SN/LN/ENH/PLUS from serial number
- **Multi-user Authentication**: Replit Auth with isolated fleet data per user
- **DMC Tool Selection**: Correct crimp/insertion tools for electrical work

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AW139 DIAGNOSTIC SYSTEM                    │
└─────────────────────────────────────────────────────────────┘
                              │
     ┌────────────────────────┼────────────────────────────┐
     │                        │                            │
     ▼                        ▼                            ▼
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ React + Vite │    │ Express Backend │    │ Python Services  │
│   Frontend   │───▶│   /api routes   │───▶│ RAG + CrewAI     │
│  Port 5000   │    │                 │    │ Ports 8000/9000  │
└──────────────┘    └─────────────────┘    └──────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  PostgreSQL     │
                    │  (Neon)         │
                    └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL database (Neon serverless recommended)
- OpenAI API key

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd aw139-diagnostic-system

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r pyproject.toml
# Or with uv: uv sync
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Required variables:
- `OPENAI_API_KEY` - OpenAI API key
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session management

### 3. Set Up Database

```bash
npm run db:push
```

### 4. Start the Application

For development (starts all services):

```bash
npm run dev
```

This starts:
- Express server + Vite frontend on port 5000
- RAG API on port 8000 (auto-started by backend)
- CrewAI server on port 9000 (auto-started by backend)

### 5. Access the Application

Open http://localhost:5000 in your browser.

## Project Structure

```
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── pages/          # Dashboard, History, Fleet pages
│       └── components/     # UI components
├── server/                 # Express.js backend
│   ├── routes.ts           # API endpoints
│   ├── diagnostic-engine.ts # AI diagnostic orchestration
│   └── db.ts               # Database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle ORM schema
├── rag_api.py              # FastAPI RAG service
├── crew_server.py          # CrewAI diagnostic agents
├── embeddings.json         # Vector embeddings (~500MB)
├── xml_data/               # AW139 XML maintenance docs
├── pdf_data/               # Training PDFs
└── pyproject.toml          # Python dependencies
```

## API Endpoints

### Diagnostic Query
```
POST /api/diagnostic
{
  "aircraftModel": "AW139",
  "serialNumber": "31001",
  "ata": "24",
  "problemDescription": "Generator voltage fluctuating",
  "taskType": "fault_isolation"
}
```

### Previous Solutions
```
GET /api/diagnostic/history
GET /api/diagnostic/:id
```

### Fleet Management
```
GET /api/fleet/aircraft
POST /api/fleet/aircraft
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Express session secret |
| `EMBEDDING_MODEL` | No | OpenAI model (default: text-embedding-3-small) |
| `PORT` | No | Server port (default: 5000) |
| `RAG_API_PORT` | No | RAG service port (default: 8000) |
| `CREW_API_PORT` | No | CrewAI port (default: 9000) |

## Re-indexing Documents

If you update the source documents:

```bash
python ingest_data.py
```

This parses all XML/PDF files and regenerates `embeddings.json`.

## Testing

```bash
# RAG API health check
curl http://localhost:8000/health

# CrewAI health check
curl http://localhost:9000/health

# Run smoke tests
python rag_smoke_test.py
```

## License

Proprietary - AW139 Maintenance Documentation System
