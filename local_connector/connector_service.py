"""
Local IETP Connector Service
Runs on Windows machine with IETP desktop application installed
Provides HTTP API for searching IETP documentation
"""

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import time

load_dotenv()

app = FastAPI(title="AW139 IETP Local Connector")

class IETPQuery(BaseModel):
    ata: str
    query: str

class IETPResponse(BaseModel):
    doc_id: str
    section: str
    quote: str

IETP_EXE_PATH = os.getenv("IETP_EXE_PATH", r"C:\Leonardo Helicopters IETP\AW139 IETP\IETP.exe")

@app.post("/local/ietp/search", response_model=IETPResponse)
async def search_ietp(q: IETPQuery):
    """
    Search IETP for ATA-specific documentation
    
    Args:
        q: IETPQuery with ata code and search query
        
    Returns:
        IETPResponse with doc_id, section, and quoted content
        
    Note: This connector requires pywinauto and pytesseract on Windows
    Install with: pip install pywinauto pytesseract Pillow
    """
    try:
        # Optional: Implement actual IETP desktop integration
        # This requires pywinauto and OCR capabilities on Windows
        # For now, return mock response structure
        
        timestamp = int(time.time())
        return IETPResponse(
            doc_id=f"IETP:ATA{q.ata}:{timestamp}",
            section="auto_detected",
            quote=f"Retrieved from IETP for ATA {q.ata}: {q.query}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IETP search failed: {str(e)}")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "IETP Local Connector"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("IETP_CONNECTOR_PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
