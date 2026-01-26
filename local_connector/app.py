from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ietp_connector_client import request_ietp_snippet

app = FastAPI(title="AW139 RAG Backend")

class IETPRequest(BaseModel):
    ata: str
    query: str

@app.post("/api/ietp")
def run_ietp(req: IETPRequest):
    result = request_ietp_snippet(req.ata, req.query)

    if result is None:
        raise HTTPException(status_code=500, detail="IETP connector error")

    if isinstance(result, dict) and result.get("error"):
        return {
            "status": "error",
            "expert_required": True,
            "reason": "Unable to extract data from IETP connector.",
            "details": result
        }

    text = result.get("text", "")
    certainty = result.get("certainty", 0)

    if certainty < 0.95:
        return {
            "status": "low_certainty",
            "certainty": certainty,
            "expert_required": True,
            "message": "Certainty below 95%, escalation to MCC recommended.",
            "snippet": text[:750]
        }

    return {
        "status": "ok",
        "certainty": certainty,
        "expert_required": False,
        "snippet": text,
        "elapsed_ms": result.get("elapsed_ms", None)
    }

@app.get("/")
def root():
    return {"msg": "AW139 RAG Backend is running."}

@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "AW139 RAG Backend"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("RAG_BACKEND_PORT", 5002))
    uvicorn.run(app, host="0.0.0.0", port=port)
