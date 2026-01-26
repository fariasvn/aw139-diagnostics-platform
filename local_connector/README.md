# Local IETP Connector Service & RAG Backend

Two-tier Python FastAPI architecture for AW139 Smart Troubleshooting:
- **connector_service.py**: Windows desktop integration (runs on Windows with IETP)
- **app.py**: RAG backend API server (runs on Windows or cloud)

## Setup

### 1. Install Python 3.10+

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure .env
```bash
cp .env.example .env
# Edit .env with your settings
```

## Running Services

### Option A: Windows Machine (Both Services)

**Terminal 1 - IETP Connector:**
```bash
python connector_service.py
```
Runs on port 5001

**Terminal 2 - RAG Backend:**
```bash
python app.py
```
Runs on port 5002 (configurable via `RAG_BACKEND_PORT`)

### Option B: Replit + Windows Split
- **Replit**: Runs main Node.js/TypeScript app
- **Windows**: Runs only `connector_service.py`
- **Replit Node.js backend** calls `connector_service.py` via `IETP_CONNECTOR_URL`

## API Endpoints

### IETP Connector Service (Port 5001)
**POST** `/local/ietp/search`
```json
{"ata": "24", "query": "electrical generation"}
```

### RAG Backend Service (Port 5002)
**POST** `/api/ietp`
```json
{"ata": "24", "query": "electrical generation"}
```

**GET** `/health` - Health check

## Integration

### With Replit Node.js Backend
```bash
IETP_CONNECTOR_URL=http://YOUR_WINDOWS_IP:5001/local/ietp/search
```

### With Python RAG Backend
```bash
RAG_BACKEND_URL=http://YOUR_WINDOWS_IP:5002
```

## Architecture

```
Replit Node.js App
    ↓
IETP Connector Client (TypeScript)
    ↓
Local IETP Connector Service (Python, Port 5001)
    ↓
Windows IETP Desktop Application
```

OR

```
Replit Node.js App
    ↓
Python RAG Backend (Port 5002)
    ↓
IETP Connector Service (Port 5001)
    ↓
Windows IETP Desktop Application
```
