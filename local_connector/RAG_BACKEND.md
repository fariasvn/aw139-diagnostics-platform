# AW139 RAG Backend (Replit Version)

This backend communicates with a **local Windows connector** that reads data from the Leonardo AW139 IETP software.

---

## 🔌 How it Works

### 1) You run the connector on your Windows PC  
This exposes:
- **Port 5001**: Local IETP Connector Service (`connector_service.py`)
- Reads from Leonardo IETP desktop application
- Returns structured ATA code documentation snippets

### 2) Replit backend calls your connector  
When you POST to:
```
http://YOUR_WINDOWS_IP:5001/local/ietp/search
```

**Request format:**
```json
{
  "ata": "24",
  "query": "electrical power generation troubleshooting"
}
```

**Response format:**
```json
{
  "doc_id": "IETP:ATA24:1234567890",
  "section": "auto_detected",
  "quote": "Retrieved IETP technical content...",
  "elapsed_ms": 1250
}
```

### 3) Optional: Python RAG Backend Layer (Port 5002)
Provides additional abstraction:
```
POST /api/ietp
```

Same request/response as above but through Python FastAPI wrapper.

---

## 🚀 Setup

### Windows Machine Setup

**1. Install dependencies:**
```bash
cd local_connector
pip install -r requirements.txt
```

**2. Create `.env`:**
```bash
cp .env.example .env
```

**3. Run the connector service:**
```bash
python connector_service.py
```

Service starts on `http://0.0.0.0:5001`

**4. (Optional) Run RAG backend:**
```bash
python app.py
```

Runs on `http://0.0.0.0:5002`

---

## 🔗 Replit Integration

### Set Environment Variables

In your Replit secrets, set:

```
IETP_CONNECTOR_URL=http://YOUR_WINDOWS_IP:5001/local/ietp/search
IETP_CONNECTOR_TOKEN=<optional_bearer_token>
```

Replace `YOUR_WINDOWS_IP` with your Windows PC's IP address.

**Note:** If running locally in development, use `http://127.0.0.1:5001/local/ietp/search`

### API Endpoints (Replit Backend)

The Replit Node.js backend provides:

**POST** `/api/diagnose`
```json
{
  "ata": "24",
  "symptoms": "No electrical power",
  "condition": "Critical"
}
```

Response includes IETP-enriched diagnostic data:
```json
{
  "diagnosis": "Electrical bus fault detected",
  "certainty": 87,
  "ietp_reference": {
    "doc_id": "IETP:ATA24:...",
    "quote": "..."
  },
  "ata_analytics": {...},
  "smart_stock": {...}
}
```

---

## 🔐 Authentication

### Bearer Token (Optional)

If your IETP connector requires authentication:

1. Set `IETP_CONNECTOR_TOKEN` in Replit secrets
2. Connector automatically includes: `Authorization: Bearer <token>`
3. Local connector service should validate this in `connector_service.py`

---

## 📊 Architecture

```
┌─────────────────┐
│  Replit Browser │
└────────┬────────┘
         │ React Frontend
         │ (47 ATA codes)
         ▼
┌─────────────────────────────────────┐
│   Replit Node.js/Express Backend    │
│  - Diagnostic Engine                │
│  - ATA Analytics                    │
│  - Smart Stock Analyzer             │
│  - Expert Booking                   │
└────────┬────────────────────────────┘
         │ HTTP/POST
         │ (IETP_CONNECTOR_URL)
         ▼
┌──────────────────────────────────────┐
│  Windows PC - Python Services        │
├──────────────────────────────────────┤
│  Port 5001: IETP Connector Service   │
│  - Reads Leonardo IETP software      │
│  - Searches ATA documentation        │
│  - Returns structured snippets       │
│                                      │
│  Port 5002: RAG Backend (optional)   │
│  - Wraps IETP connector calls        │
│  - Additional RAG processing         │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Leonardo AW139 IETP Software        │
│  (Desktop application on Windows)    │
└──────────────────────────────────────┘
```

---

## 🧪 Testing

### 1. Test Local Connector
```bash
curl -X POST http://127.0.0.1:5001/local/ietp/search \
  -H "Content-Type: application/json" \
  -d '{"ata":"24","query":"electrical fault"}'
```

### 2. Test Replit Backend → Connector
From Replit terminal:
```bash
curl -X POST http://YOUR_WINDOWS_IP:5001/local/ietp/search \
  -H "Content-Type: application/json" \
  -d '{"ata":"24","query":"electrical troubleshooting"}'
```

### 3. Test Full Diagnostic Flow
1. Open Replit app in browser
2. Fill diagnostic form (ATA 24, symptoms, condition)
3. Submit diagnosis
4. Check that IETP reference appears in response

---

## 🛠 Troubleshooting

### "Connection refused" error
- Is Windows PC running?
- Is `connector_service.py` running on port 5001?
- Is firewall blocking port 5001?
- Use correct IP: `ipconfig` on Windows to get local IP

### "IETP connector failed"
- Check Windows PC logs: `connector_service.py` console
- Verify IETP desktop software is installed
- Check IETP path in `.env`

### Timeout (>15 seconds)
- IETP searches can take time
- Increase `timeout` parameter in client code
- Check Windows PC performance

### Bearer token rejected
- Verify `IETP_CONNECTOR_TOKEN` value
- Ensure connector validates tokens correctly in `connector_service.py`

---

## 📝 Advanced Configuration

### Custom IETP Path
Edit `.env`:
```
IETP_EXE_PATH=C:\Custom\Path\To\IETP.exe
```

### Change Ports
```
IETP_CONNECTOR_PORT=5001      # IETP connector
RAG_BACKEND_PORT=5002          # RAG backend (optional)
```

### Logging
Python services log to console. For file logging, update `connector_service.py`:
```python
logging.basicConfig(filename='ietp_connector.log', level=logging.INFO)
```

---

## 🚀 Production Deployment

### Replit Only (Recommended)
- Deploy Replit app to production
- Keep Windows connector running on your office PC
- Use static IP or dynamic DNS for Windows machine

### Windows Server
- Run connector on dedicated Windows server
- Use HTTPS with certificates
- Add API key authentication layer
- Monitor uptime with health checks

### Cloud Integration
- Run Replit backend on production server
- Windows connector stays local (security best practice)
- Both can scale independently

---

## 📚 API Reference

### IETP Connector Service (Port 5001)

**POST** `/local/ietp/search`
- **Body:** `{ "ata": string, "query": string }`
- **Response:** `{ "doc_id": string, "section": string, "quote": string, "elapsed_ms": number }`

**GET** `/health`
- **Response:** `{ "status": "ok" }`

### RAG Backend Service (Port 5002)

**POST** `/api/ietp`
- **Body:** `{ "ata": string, "query": string }`
- **Response:** `{ "doc_id": string, "section": string, "quote": string, "elapsed_ms": number }`

**GET** `/health`
- **Response:** `{ "status": "ok", "service": "AW139 RAG Backend" }`

### Replit Backend (Main API)

**POST** `/api/diagnose`
- Full diagnostic with ATA analytics and Smart Stock

**GET** `/api/analytics/ata/:ata`
- Get historical data for specific ATA code

**POST** `/api/expert/book`
- Book expert support session

See `server/routes.ts` for complete API documentation.

---

## 📦 Environment Variables (.env)

### Windows Machine (.env)

```env
# IETP Desktop Application Configuration
IETP_EXE_PATH=C:\Leonardo Helicopters IETP\AW139 IETP\IETP.exe

# Service Ports
IETP_CONNECTOR_PORT=5001
RAG_BACKEND_PORT=5002

# Connector URL (for RAG backend to call connector)
IETP_CONNECTOR_URL=http://127.0.0.1:5001/local/ietp/search

# Optional: Authentication Token
IETP_CONNECTOR_TOKEN=
```

### Replit Secrets (Browser → Settings → Secrets)

```
IETP_CONNECTOR_URL=http://YOUR_WINDOWS_IP:5001/local/ietp/search
IETP_CONNECTOR_TOKEN=<optional_bearer_token>
DATABASE_URL=postgresql://...
SESSION_SECRET=<generate_random_string>
OPENAI_API_KEY=sk-...
```

### Key Variables Explained

| Variable | Location | Purpose | Example |
|----------|----------|---------|---------|
| `IETP_EXE_PATH` | Windows `.env` | Path to Leonardo IETP software | `C:\Program Files\Leonardo\IETP.exe` |
| `IETP_CONNECTOR_PORT` | Windows `.env` | Port for connector service | `5001` |
| `RAG_BACKEND_PORT` | Windows `.env` | Port for RAG backend (optional) | `5002` |
| `IETP_CONNECTOR_URL` | Both | URL connector listens on | `http://127.0.0.1:5001/local/ietp/search` |
| `IETP_CONNECTOR_TOKEN` | Both | Bearer token for auth (optional) | `Bearer_token_xyz` |
| `DATABASE_URL` | Replit | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | Replit | Express session encryption key | `your-secret-key-here` |
| `OPENAI_API_KEY` | Replit | OpenAI API for diagnostics | `sk-proj-...` |

### Finding Your Windows IP

1. Open Command Prompt on Windows
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your network adapter
4. Example: `192.168.1.100`

Then update Replit:
```
IETP_CONNECTOR_URL=http://192.168.1.100:5001/local/ietp/search
```

### Firewall Configuration

Allow Windows Firewall access on port 5001:

```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="IETP Connector" dir=in action=allow protocol=tcp localport=5001
```

Or allow through Windows Defender Firewall GUI:
1. Settings → Firewall & network protection
2. Advanced settings
3. Inbound Rules → New Rule
4. Port → TCP → 5001 → Allow

---

## ▶ How to Run (Replit)

### 1. Set Environment Variables
In Replit Secrets, configure:
```
IETP_CONNECTOR_URL=http://YOUR_WINDOWS_IP:5001/local/ietp/search
```

### 2. Deploy Application
```bash
npm run build
npm run dev
```

App runs at `http://localhost:5000`

### 3. Test Diagnostic Flow
1. Open browser to Replit project URL
2. Select ATA code (e.g., "24 - Electrical Power")
3. Enter symptoms and condition
4. Click "Analyze"
5. See IETP-enriched results with Smart Stock and expert options

---

## 🌐 Remote Access Options

### Option 1: Direct IP (Recommended for Private Networks)
**Windows Machine:**
```bash
python connector_service.py
```

**Replit Secrets:**
```
IETP_CONNECTOR_URL=http://192.168.1.100:5001/local/ietp/search
```

✅ **Pros:** Simple, fast, secure on private network
❌ **Cons:** Requires static IP or DNS, firewall configuration

### Option 2: NGROK Tunnel
**Windows Machine:**
1. Install NGROK: https://ngrok.com/download
2. Start connector:
   ```bash
   python connector_service.py
   ```
3. In another terminal, expose port 5001:
   ```bash
   ngrok http 5001
   ```
4. Copy forwarding URL (e.g., `https://abc123.ngrok.io`)

**Replit Secrets:**
```
IETP_CONNECTOR_URL=https://abc123.ngrok.io/local/ietp/search
IETP_CONNECTOR_TOKEN=<ngrok_token_if_required>
```

✅ **Pros:** Works across internet, no firewall config needed
❌ **Cons:** Requires NGROK account, added latency, URL changes on restart

### Option 3: Cloudflared Tunnel (Free)
**Windows Machine:**
1. Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/
2. Create tunnel:
   ```bash
   cloudflared tunnel create aw139-ietp
   ```
3. Configure tunnel to port 5001:
   ```bash
   cloudflared tunnel route dns aw139-ietp.YOUR_DOMAIN.com
   ```
4. Start connector + tunnel:
   ```bash
   python connector_service.py
   cloudflared tunnel run aw139-ietp
   ```

**Replit Secrets:**
```
IETP_CONNECTOR_URL=https://aw139-ietp.YOUR_DOMAIN.com/local/ietp/search
```

✅ **Pros:** Free, no NGROK limits, stable URL, secure
❌ **Cons:** Requires Cloudflare account, additional setup

### Option 4: Windows Server (Production)
Deploy on VPS or cloud instance with:
- Static public IP
- TLS/HTTPS certificates
- API key authentication
- Monitoring and alerting

---

## 🚀 Production Checklist

- [ ] Windows connector running on port 5001
- [ ] Firewall allows port 5001 (or using tunnel)
- [ ] `IETP_CONNECTOR_URL` set in Replit secrets
- [ ] Test health check: `GET /health`
- [ ] Test IETP search: `POST /local/ietp/search`
- [ ] Database seeded with historical data
- [ ] Publish Replit app
- [ ] Monitor connector logs for errors
- [ ] Set up backup Windows machine (optional)

---

## 📞 Support

**For issues:**
1. Check Windows connector logs
2. Run health check from Replit
3. Verify firewall settings
4. Test IETP desktop app manually
5. Review IETP path in `.env`

**For scaling:**
- Increase connector timeout in `ietp_connector_client.py`
- Add caching layer for common queries
- Deploy multiple connector instances with load balancer

---

---

## 🖥 How to Call (Examples)

### cURL - IETP Connector Search

**Windows PC running on port 5001:**
```bash
curl -X POST http://127.0.0.1:5001/local/ietp/search \
  -H "Content-Type: application/json" \
  -d '{"ata":"24","query":"electrical power generation fault"}'
```

**Remote Windows PC via IP:**
```bash
curl -X POST http://192.168.1.100:5001/local/ietp/search \
  -H "Content-Type: application/json" \
  -d '{"ata":"24","query":"electrical troubleshooting"}'
```

**Remote Windows PC via NGROK:**
```bash
curl -X POST https://abc123.ngrok.io/local/ietp/search \
  -H "Content-Type: application/json" \
  -d '{"ata":"24","query":"electrical power"}'
```

**With Bearer Token:**
```bash
curl -X POST http://127.0.0.1:5001/local/ietp/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"ata":"24","query":"electrical fault"}'
```

### Python - IETP Connector Client

```python
from ietp_connector_client import request_ietp_snippet

# Simple search
result = request_ietp_snippet("24", "electrical power generation")
print(f"Doc ID: {result['doc_id']}")
print(f"Section: {result['section']}")
print(f"Quote: {result['quote']}")
print(f"Response time: {result['elapsed_ms']}ms")
```

### TypeScript - IETP Connector Client

```typescript
import { requestIETPSnippet } from "@server/ietp-connector";

const result = await requestIETPSnippet("24", "electrical power generation");
console.log(`Doc ID: ${result?.doc_id}`);
console.log(`Quote: ${result?.quote}`);
console.log(`Time: ${result?.elapsed_ms}ms`);
```

### JavaScript/Fetch - Call from Frontend

```javascript
async function searchIETP(ata, query) {
  const response = await fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ata,
      symptoms: query,
      condition: 'Routine'
    })
  });
  
  const data = await response.json();
  console.log('Diagnosis:', data.diagnosis);
  console.log('IETP Reference:', data.ietp_reference);
  console.log('Smart Stock:', data.smart_stock);
}

// Usage
await searchIETP('24', 'no electrical power');
```

### React Component Example

```tsx
import { useQuery } from '@tanstack/react-query';

export function DiagnosisComponent({ ata, symptoms }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/diagnose', ata],
    queryFn: () => 
      fetch('/api/diagnose', {
        method: 'POST',
        body: JSON.stringify({ ata, symptoms, condition: 'Routine' })
      }).then(r => r.json())
  });

  if (isLoading) return <div>Analyzing...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>{data.diagnosis}</h3>
      <p>Certainty: {data.certainty}%</p>
      {data.ietp_reference && (
        <div>
          <strong>IETP Reference:</strong>
          <p>{data.ietp_reference.quote}</p>
        </div>
      )}
    </div>
  );
}
```

### Node.js Backend - Call Connector

```typescript
// In server/routes.ts
import { requestIETPSnippet } from './ietp-connector';

app.post('/api/diagnose', async (req, res) => {
  const { ata, symptoms } = req.body;

  // Get IETP reference
  const ietp = await requestIETPSnippet(ata, symptoms);

  // Get diagnostic analysis
  const diagnosis = await runDiagnosticEngine(ata, symptoms);

  // Get analytics
  const analytics = await getATAAnalytics(ata);

  res.json({
    diagnosis: diagnosis.analysis,
    certainty: diagnosis.certainty,
    ietp_reference: ietp,
    ata_analytics: analytics,
    smart_stock: await analyzeSmartStock(ata)
  });
});
```

### Advanced - Batch IETP Searches

```python
import asyncio
from ietp_connector_client import request_ietp_snippet

async def batch_search(queries):
    """Search multiple ATA codes in parallel"""
    tasks = [
        request_ietp_snippet(ata, query)
        for ata, query in queries
    ]
    return await asyncio.gather(*tasks)

# Search 5 ATA codes simultaneously
results = asyncio.run(batch_search([
    ("24", "electrical power"),
    ("32", "landing gear"),
    ("71", "power plant"),
    ("36", "pneumatic"),
    ("05", "periodic inspection")
]))
```

### Health Check

```bash
# Check if connector is running
curl http://127.0.0.1:5001/health

# Response:
# {"status":"ok"}
```

### Error Handling

```python
result = request_ietp_snippet("24", "electrical")

if result is None:
    print("Connector error - check Windows PC and firewall")
else:
    print(f"Success: {result['quote']}")
```

---

## 🔄 Request Flow Diagram

```
┌──────────────────────────┐
│   User/Frontend Browser  │
│  (React Diagnostic Form) │
└───────────┬──────────────┘
            │ POST /api/diagnose
            │ {ata, symptoms, condition}
            ▼
┌──────────────────────────────────────┐
│     Replit Node.js Backend           │
│  (Diagnostic Engine + Analytics)     │
└───────────┬──────────────────────────┘
            │ requestIETPSnippet(ata, query)
            │ HTTP POST to IETP_CONNECTOR_URL
            ▼
┌──────────────────────────────────────┐
│  Windows PC - IETP Connector Service │
│  (Python FastAPI on port 5001)       │
└───────────┬──────────────────────────┘
            │ Search Leonardo IETP Desktop
            │ Extract documentation snippets
            ▼
┌──────────────────────────────────────┐
│  Leonardo AW139 IETP Desktop App     │
│  (Windows-only software)             │
└──────────────────────────────────────┘
            │
            │ Returns: {doc_id, section, quote}
            ▼
┌──────────────────────────────────────┐
│  Windows PC - IETP Connector Service │
│  Formats response with elapsed_ms    │
└───────────┬──────────────────────────┘
            │ HTTP 200 JSON response
            ▼
┌──────────────────────────────────────┐
│     Replit Node.js Backend           │
│  Combines IETP data with:            │
│  - Diagnostic analysis               │
│  - ATA analytics                     │
│  - Smart Stock predictions           │
└───────────┬──────────────────────────┘
            │ JSON response with all enriched data
            ▼
┌──────────────────────────────────────┐
│   User/Frontend Browser              │
│  Displays ENTERPRISE results with:   │
│  - Diagnosis + Certainty             │
│  - IETP Reference Snippets           │
│  - Parts Recommendations             │
│  - Expert Booking Option             │
└──────────────────────────────────────┘
```

**Key Point:** Replit backend forwards diagnostic requests to your Windows connector and merges the returned IETP extracts with AI analysis, creating a unified diagnostic response.

---

## 🎯 Next Steps

1. **Set up Windows connector** - Copy `local_connector/` to Windows machine
2. **Configure .env** - Set IETP path and ports on Windows
3. **Configure Replit secrets** - Set `IETP_CONNECTOR_URL` with Windows IP
4. **Test connectivity** - Run health checks from Replit
5. **Seed database** - Add historical ATA occurrence data
6. **Deploy to production** - Publish Replit app and keep connector running
7. **Monitor logs** - Track connector performance and errors
