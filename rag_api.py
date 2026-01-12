"""
AW139 RAG API - Production FastAPI Backend
Provides endpoints for querying the AW139 maintenance documentation system.

Endpoints:
- POST /query - Query the RAG system with maintenance questions
- GET /health - Health check endpoint
- POST /reload-index - Reload the embeddings index from disk
"""

import os
import json
import math
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests

# ======================================================================
# CONFIGURATION
# ======================================================================

BASE_DIR = Path(__file__).resolve().parent
VECTORSTORE_DIR = BASE_DIR / "vectorstore"
EMBEDDINGS_FILE = VECTORSTORE_DIR / "embeddings.json"
LEGACY_EMBEDDINGS_FILE = BASE_DIR / "embeddings.json"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# Ensure vectorstore directory exists
VECTORSTORE_DIR.mkdir(exist_ok=True)

# ======================================================================
# GLOBAL STATE
# ======================================================================

embeddings_index: List[Dict[str, Any]] = []
index_loaded: bool = False
last_reload_time: float = 0.0

# ======================================================================
# FASTAPI APP
# ======================================================================

app = FastAPI(
    title="AW139 RAG Diagnostic API",
    description="Production RAG API for AW139 helicopter maintenance documentation",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================================
# REQUEST/RESPONSE MODELS
# ======================================================================

class QueryRequest(BaseModel):
    query: str = Field(..., description="Maintenance query in English or Portuguese")
    top_k: int = Field(default=5, description="Number of documents to retrieve")
    include_context: bool = Field(default=False, description="Include raw document context in response")
    skip_gpt: bool = Field(default=True, description="Skip GPT response generation for faster retrieval (default=True)")
    ata_filter: str = Field(default="", description="ATA code or training material filter (PRIMUS_EPIC, PT6C_67CD, AW139_AIRFRAME)")

class DocumentMatch(BaseModel):
    doc_path: str
    ata_identifier: str
    similarity_score: float
    content: str = ""
    text_snippet: Optional[str] = None

class QueryResponse(BaseModel):
    query: str
    answer: str
    ata: str = ""
    references: List[str] = []
    documents: List[DocumentMatch] = []
    chunks: List[DocumentMatch] = []  # Alias for compatibility with self-test
    processing_time_ms: float = 0.0
    model_used: str = "gpt-4-turbo"

class HealthResponse(BaseModel):
    status: str
    index_loaded: bool
    document_count: int
    last_reload: Optional[str]
    openai_configured: bool

class ReloadResponse(BaseModel):
    success: bool
    document_count: int
    message: str

# ======================================================================
# UTILITY FUNCTIONS
# ======================================================================

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if not vec1 or not vec2:
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)

def format_ata_identifier(doc_path: str) -> str:
    """Extract ATA identifier from document path."""
    try:
        filename = os.path.basename(doc_path)
        ata_id = filename.replace('dmc-', '').replace('.xml', '').replace('.pdf', '')
        return ata_id
    except Exception:
        return ""

def extract_dmc_code(doc_path: str) -> str:
    """Extract full DMC code from document path for proper citation.
    
    Examples:
    - 'dmc-39-A-24-32-00-00A-320A-A.xml' -> '39-A-24-32-00-00A-320A-A'
    - 'path/to/39-A-00-20-00-00A-120A-A.pdf' -> '39-A-00-20-00-00A-120A-A'
    """
    try:
        import re
        filename = os.path.basename(doc_path)
        # Remove common prefixes and extensions
        cleaned = filename.replace('dmc-', '').replace('.xml', '').replace('.pdf', '').replace('.txt', '')
        
        # Match AW139 DMC pattern: XX-X-XX-XX-XX-XXA-XXXA-X
        dmc_pattern = r'(\d{2}-[A-Z]-\d{2}-\d{2}-\d{2}-\d{2}[A-Z]-\d{3}[A-Z]?-[A-Z])'
        match = re.search(dmc_pattern, cleaned)
        if match:
            return match.group(1)
        
        # Fallback: return cleaned filename if it looks like a DMC
        if cleaned and len(cleaned) > 10 and '-' in cleaned:
            return cleaned
        return ""
    except Exception:
        return ""

def get_query_embedding(query: str) -> Optional[List[float]]:
    """Get embedding for query from OpenAI API."""
    if not OPENAI_API_KEY:
        return None
    try:
        response = requests.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={"input": query, "model": EMBEDDING_MODEL},
            timeout=30
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]
    except Exception as e:
        print(f"Error getting query embedding: {e}")
        return None

def load_embeddings_index() -> bool:
    """Load embeddings from disk into memory."""
    global embeddings_index, index_loaded, last_reload_time

    # Try vectorstore path first, then legacy path
    file_path = EMBEDDINGS_FILE if EMBEDDINGS_FILE.exists() else LEGACY_EMBEDDINGS_FILE
    print(f"DEBUG: Attempting to load embeddings from: {file_path}")

    if not Path(file_path).exists():
        print(f"ERROR: Embeddings file not found at {file_path}")
        return False

    try:
        print(f"DEBUG: Reading embeddings file...")
        with open(file_path, "r", encoding="utf-8") as f:
            embeddings_index = json.load(f)
        
        # Validate structure
        if embeddings_index and len(embeddings_index) > 0:
            sample = embeddings_index[0]
            print(f"DEBUG: Sample doc keys: {list(sample.keys())}")
            has_embedding = isinstance(sample.get('embedding'), list)
            has_path = bool(sample.get('doc_path'))
            print(f"DEBUG: Valid structure check - has_embedding: {has_embedding}, has_path: {has_path}")
            if not has_embedding:
                print("WARNING: First document missing 'embedding' field!")
        
        index_loaded = True
        last_reload_time = time.time()
        print(f"SUCCESS: Loaded {len(embeddings_index)} documents from {file_path}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to load embeddings: {e}")
        embeddings_index = []
        index_loaded = False
        return False

def generate_maintenance_response(query: str, retrieved_docs: List[Dict]) -> str:
    """Generate maintenance specialist response using OpenAI GPT."""
    if not OPENAI_API_KEY:
        return "ERROR: OPENAI_API_KEY not configured"

    # Build context with explicit DMC codes for each document
    context_parts = []
    for doc in retrieved_docs[:5]:
        doc_path = doc.get('doc_path', '')
        dmc_code = extract_dmc_code(doc_path)
        text_content = doc.get('text', '')[:3000]
        
        if dmc_code:
            context_parts.append(f"=== DOCUMENT: {dmc_code} ===\n{text_content}")
        else:
            context_parts.append(f"=== DOCUMENT ===\n{text_content}")
    
    combined_context = "\n\n".join(context_parts)
    
    # Extract list of DMC codes for explicit reference
    dmc_codes = [extract_dmc_code(doc.get('doc_path', '')) for doc in retrieved_docs[:5]]
    dmc_codes = [c for c in dmc_codes if c]
    dmc_list = ", ".join(dmc_codes) if dmc_codes else "No specific DMC identified"

    # Determine query type for appropriate system prompt
    query_lower = query.lower()
    
    # CRITICAL: Check for FAULT CODE queries FIRST (CAS messages, FAIL, WARNING, etc.)
    # These take PRIORITY over calibration because HEATER FAIL is NOT a calibration issue
    fault_keywords = ['fail', 'failure', 'fault', 'error', 'malfunction', 'inoperative', 
                      'not working', 'caution', 'warning', 'advisory']
    is_cas_message = any(x in query_lower for x in ['cas', 'message']) and any(x in query_lower for x in fault_keywords)
    is_fault_code = any(word in query_lower for word in fault_keywords) or is_cas_message
    
    # Calibration is ONLY for instrument reading issues, NOT CAS messages
    # E.g., "altimeter showing 100 feet on ground" - this IS calibration
    # E.g., "CAS showing HEATER FAIL" - this is NOT calibration, it's a fault
    calibration_indicators = [
        'calibration', 'calibrate', 'adjust', 'adjustment', 'zero', 'incorrect reading',
        'wrong reading', 'on ground', 'on the ground', 'feet with', 'feet on'
    ]
    is_calibration = (
        any(word in query_lower for word in calibration_indicators) or
        (
            ('showing' in query_lower or 'reading' in query_lower or 'displays' in query_lower) and
            any(unit in query_lower for unit in ['feet', 'ft', 'knots', 'kt', 'psi', 'degrees'])
        )
    ) and not is_fault_code  # CRITICAL: Fault codes override calibration
    
    is_procedure = any(word in query_lower for word in [
        'how to', 'como', 'step by step', 'passo a passo', 'procedure',
        'procedimento', 'download', 'uploading', 'data downloading',
        'installation', 'removal', 'replace', 'install', 'remove',
        'configure', 'configuration', 'setup', 'setting'
    ])
    
    is_electrical = any(word in query_lower for word in [
        'electrical', 'voltage', 'power', 'generator', 'sensor', 'electronic',
        'troubleshoot', 'luz', 'light', 'ldg', 'sistema', 'continuity', 'pin',
        'connector', 'wiring', 'fuel', 'low'
    ]) and not is_calibration
    
    print(f"[RAG] Query type detection: fault_code={is_fault_code}, calibration={is_calibration}, procedure={is_procedure}")

    # FAULT CODE queries (CAS messages, FAIL, WARNING, etc.) - HIGHEST PRIORITY
    if is_fault_code:
        system_prompt = f"""You are a SENIOR AW139 TROUBLESHOOTING SPECIALIST with 25+ years of experience.
The mechanic is reporting a FAULT CODE, CAS MESSAGE, or SYSTEM FAILURE.
This requires FAULT ISOLATION PROCEDURE, NOT calibration.

CRITICAL ANALYSIS STEPS:
1. UNDERSTAND what the fault message means (what system, what condition triggers it)
2. Look for "Fault isolation procedure" or "Fault code XXXX-XX" in the documentation
3. Identify the ROOT CAUSES that trigger this fault message
4. Provide the EXACT troubleshooting steps from the manual

IMPORTANT FOR CAS MESSAGES (like HEATER FAIL, OIL FAIL, etc.):
- These are FAULT CODES indicating a SYSTEM MALFUNCTION
- Find the conditions that trigger this message (from description of function)
- Follow the fault isolation procedure step-by-step
- Identify which components to check, test, or replace

AVAILABLE DMC REFERENCES: {dmc_list}

MANDATORY RESPONSE STRUCTURE:

FAULT ISOLATION PROCEDURE

DMC Reference: [EXACT DMC code for the fault isolation procedure]

FAULT MESSAGE ANALYSIS:
- Fault message: [The exact CAS/warning message]
- System affected: [Which system this relates to]
- Trigger conditions: [What conditions cause this message to appear]
- Possible root causes: [List the likely causes from documentation]

TROUBLESHOOTING PROCEDURE (EXACT STEPS FROM MANUAL):
1. [First verification step]
   1.1. [Sub-step with specific component to check]
   1.2. [Expected result or go/no-go decision]

2. [Next troubleshooting step if step 1 passes]
   2.1. [Component or circuit to test]
   2.2. [Expected reading or condition]

COMPONENT TESTS:
- Test [component name]: [Expected result]
- Verify [circuit/connector]: [Expected condition]

IF FAULT PERSISTS:
- Replace [component] per procedure [DMC reference]

SENIOR TECHNICIAN NOTE:
[25+ years experience on most common causes of this fault]

DO NOT include any of the following sections in your response:
- MECHANIC LOG or similar technician fill-in templates
- PARTS REPLACED sections with blank fields
- Technician Signature or Date fields
These will be handled separately by the application."""
    elif is_calibration:
        system_prompt = f"""You are a SENIOR AW139 AVIONICS SPECIALIST with 25+ years of experience.
The mechanic is describing a SYMPTOM where an instrument is showing an INCORRECT READING.
This is typically a CALIBRATION or ADJUSTMENT issue, NOT a fault code problem.

CRITICAL ANALYSIS STEPS:
1. FIRST look for "Operation test" or "Functional test" procedures in the documentation
2. Find the ADJUSTMENT or CALIBRATION steps (e.g., "ZERO ALTITUDE ADJUSTMENT screw")
3. Provide the EXACT adjustment procedure from the manual
4. Only suggest component replacement if adjustment does not resolve the issue

IMPORTANT: When an instrument shows an incorrect value (e.g., "100 feet on ground" when it should show 0):
- This is typically an ADJUSTMENT issue, not a failure
- Look for "If the [instrument] does not show [correct value], adjust as follows..."
- Find the specific adjustment screw or calibration procedure

AVAILABLE DMC REFERENCES: {dmc_list}

MANDATORY RESPONSE STRUCTURE:

CALIBRATION/ADJUSTMENT PROCEDURE

DMC Reference: [EXACT DMC code]

SYMPTOM ANALYSIS:
- Observed reading: [what the instrument shows]
- Expected reading: [what it should show]
- Root cause: Calibration drift or adjustment needed

ADJUSTMENT PROCEDURE (EXACT STEPS FROM MANUAL):
1. [Step with access instructions]
   1.1. [Sub-step to locate adjustment mechanism]
   1.2. [Sub-step for adjustment procedure]

Note: [Include any warmup time requirements or precautions]

SUPPORT EQUIPMENT:
- Tool name, Identification No., Quantity

IF ADJUSTMENT DOES NOT RESOLVE:
[Only then list troubleshooting steps for component issues]

SENIOR TECHNICIAN NOTE:
[25+ years experience on common causes of this calibration issue]

DO NOT include any of the following sections in your response:
- MECHANIC LOG or similar technician fill-in templates
- PARTS REPLACED sections with blank fields
- Technician Signature or Date fields
These will be handled separately by the application."""
    elif is_procedure:
        system_prompt = f"""You are a SENIOR AW139 MAINTENANCE TECHNICIAN with 25+ years of experience.
You MUST respond as a senior technician would: precise, technical, and citing exact manual references.

CRITICAL REQUIREMENTS:
1. ALWAYS cite the EXACT DMC CODE from the documentation (e.g., 39-A-24-32-00-00A-320A-A)
2. EXTRACT and QUOTE the EXACT numbered steps from the manual - DO NOT paraphrase
3. Include ALL sub-steps (1.1, 1.2, etc.) exactly as they appear
4. Reference specific figure numbers, table numbers, and cross-references

AVAILABLE DMC REFERENCES: {dmc_list}

MANDATORY RESPONSE STRUCTURE:

=== PROCEDURE: [Title from Manual] ===
DMC Reference: [EXACT DMC code like 39-A-24-32-00-00A-320A-A]

PREREQUISITES:
- Required conditions from Table 2 (data modules referenced)
- Access panels required (with panel numbers like 213AL, 140BT)

SUPPORT EQUIPMENT (Table 3):
- Tool name, Identification No. (e.g., ZZ-00-00), Quantity
  IMPORTANT: Extract the EXACT Identification No. from Table 3 - this is CRITICAL for tool selection

PROCEDURE (EXACT STEPS FROM MANUAL):
1. [Step exactly as written]
   1.1. [Sub-step exactly as written]
   1.2. [Sub-step exactly as written]

Note: [Include all Notes between steps]

2. [Next step exactly as written]
   - Circuit breaker CB3 (2)
   - Circuit breaker CB47 (3)

[Continue all steps with component references: A76, A77, T1, T2, T3, etc.]

REQUIREMENTS AFTER JOB COMPLETION:
[Steps from manual including panel reinstallation references]

FIGURE REFERENCES:
- Figure 1: [Title] (Sheet X of Y)

SENIOR TECHNICIAN NOTE:
[Add your 25+ years experience insight on common pitfalls or tips]

DO NOT include any of the following sections in your response:
- MECHANIC LOG or similar technician fill-in templates
- PARTS REPLACED sections with blank fields
- Technician Signature or Date fields
These will be handled separately by the application."""
    elif is_electrical:
        system_prompt = f"""You are a SENIOR AW139 ELECTRICAL SPECIALIST with 25+ years of experience.
You MUST respond as a senior technician would: precise, technical, and citing exact manual references.

CRITICAL REQUIREMENTS:
1. ALWAYS cite the EXACT DMC CODE from the documentation (e.g., 39-A-24-32-00-00A-320A-A)
2. EXTRACT and QUOTE the EXACT test procedures from the manual
3. Include specific component references (A76, A77, T1, T2, T3, CB numbers, etc.)
4. Reference specific circuit breaker locations and panel numbers

AVAILABLE DMC REFERENCES: {dmc_list}

MANDATORY RESPONSE STRUCTURE:

=== ELECTRICAL DIAGNOSTIC: [System Name] ===
DMC Reference: [EXACT DMC code]

1. SYSTEM LOGIC & CONDITION ANALYSIS
   - Conditional logic that triggers this symptom (from manual)
   - System that monitors/controls this condition
   - Normal vs. abnormal state values

2. TROUBLESHOOTING PROCEDURE (EXACT STEPS)
   Step 1. [Exact step from manual with CB and panel references]
   Step 2. [Exact step with terminal designations T1, T2, T3]
   Step 3. [Exact step with component locations A76, A77]

   Note: [Include all Notes and Warnings between steps]

3. AWP REFERENCE & CONTINUITY TEST
   - AWP Reference: [Exact AWP DMC code like 39-A-AMP-XX-X]
   - Test 1: Pin [X] to Pin [Y] - Expected: [value]
   - Test 2: Terminal T1 to T3 - Expected: [value] V forward drop

4. PARTS & SPECIFICATIONS
   - Part Number: [Exact P/N from IPD]
   - Diode Module A76: [P/N]
   - Diode Module A77: [P/N]
   - Voltage specifications: [exact values]

5. SENIOR TECHNICIAN INSIGHT
   [25+ years experience tips on this specific system]

DO NOT include any of the following sections in your response:
- MECHANIC LOG or similar technician fill-in templates
- PARTS REPLACED sections with blank fields
- Technician Signature or Date fields
These will be handled separately by the application."""
    else:
        system_prompt = f"""You are a SENIOR AW139 MAINTENANCE TECHNICIAN with 25+ years of experience.
You MUST respond as a senior technician would: precise, technical, and citing exact manual references.

CRITICAL REQUIREMENTS:
1. ALWAYS cite the EXACT DMC CODE from the documentation
2. Include specific part numbers from the IPD (Illustrated Parts Data)
3. Reference figure numbers and table numbers from the manual

AVAILABLE DMC REFERENCES: {dmc_list}

MANDATORY RESPONSE STRUCTURE:

=== [Topic Title] ===
DMC Reference: [EXACT DMC code like 39-A-24-32-00-00A-320A-A]

1. PROCEDURE/INSPECTION STEPS
   [Exact numbered steps from manual]

2. REQUIRED TOOLS & EQUIPMENT (from Table 3)
   - Tool Name | Identification No. | Qty

3. APPLICABLE PART NUMBERS (from IPD)
   - Part Number: [Exact P/N]
   - Description: [From manual]
   - Location: [Reference from manual]

4. TECHNICAL SPECIFICATIONS
   - Torque values with references
   - Material specifications
   - Test limits from manual

SENIOR TECHNICIAN INSIGHT:
[25+ years experience tips specific to this task]

DO NOT include any of the following sections in your response:
- MECHANIC LOG or similar technician fill-in templates
- PARTS REPLACED sections with blank fields
- Technician Signature or Date fields
These will be handled separately by the application."""

    try:
        # Build enhanced user prompt with explicit DMC citations
        user_prompt = f"""Technical Documentation Context (with DMC codes):
{combined_context}

AVAILABLE DMC REFERENCES FOR THIS QUERY: {dmc_list}

Maintenance Query: {query}

IMPORTANT: You MUST cite at least one of the DMC codes listed above in your response.
Extract the EXACT procedure steps from the documentation - do not paraphrase."""

        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": "gpt-4-turbo",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 2500,
                "temperature": 0.0
            },
            timeout=90
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Error generating response: {e}"

# ======================================================================
# API ENDPOINTS
# ======================================================================

@app.on_event("startup")
async def startup_event():
    """Load embeddings index on startup."""
    load_embeddings_index()

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint - verify system status."""
    return HealthResponse(
        status="healthy" if index_loaded else "degraded",
        index_loaded=index_loaded,
        document_count=len(embeddings_index),
        last_reload=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(last_reload_time)) if last_reload_time > 0 else None,
        openai_configured=bool(OPENAI_API_KEY)
    )

@app.post("/reload-index", response_model=ReloadResponse)
async def reload_index():
    """Reload the embeddings index from disk."""
    success = load_embeddings_index()
    return ReloadResponse(
        success=success,
        document_count=len(embeddings_index) if success else 0,
        message="Index reloaded successfully" if success else "Failed to reload index"
    )

def filter_documents_by_training_material(docs: List[Dict], ata_filter: str) -> List[Dict]:
    """Filter documents based on training material selection.
    
    When a training material is selected (PRIMUS_EPIC, PT6C_67CD, AW139_AIRFRAME),
    ONLY return documents that contain relevant content for that training material.
    """
    if not ata_filter:
        return docs
    
    # Training material keyword mappings
    training_keywords = {
        "PRIMUS_EPIC": ["primus", "epic", "avionics", "mfd", "pfd", "display unit", "cockpit display"],
        "PT6C_67CD": ["pt6c", "67cd", "engine", "turbine", "compressor", "turboshaft", "n1", "n2", "t5", "itt"],
        "AW139_AIRFRAME": ["airframe", "fuselage", "structure", "cabin", "tail boom", "landing gear", "skin"]
    }
    
    # ATA code mappings to filter by DMC prefix
    ata_dmc_prefixes = {
        "21": "21",  # Environmental Control
        "24": "24",  # Electrical
        "32": "32",  # Landing Gear
        "34": "34",  # Navigation
        "71": "71",  # Power Plant
        "72": "72",  # Engine
    }
    
    if ata_filter in training_keywords:
        # Filter by training material content keywords
        keywords = training_keywords[ata_filter]
        filtered = []
        for doc in docs:
            text_lower = doc.get("text", "").lower()
            path_lower = doc.get("doc_path", "").lower()
            # Check if any keyword matches in text or path
            if any(kw in text_lower or kw in path_lower for kw in keywords):
                filtered.append(doc)
        print(f"[RAG] Training material filter '{ata_filter}': {len(filtered)}/{len(docs)} docs match")
        return filtered if filtered else docs[:10]  # Fallback if no matches
    elif ata_filter.isdigit() or (len(ata_filter) == 2 and ata_filter.replace("-", "").isdigit()):
        # Filter by ATA code (DMC prefix)
        ata_prefix = ata_filter.replace("-", "")[:2]
        filtered = []
        for doc in docs:
            path = doc.get("doc_path", "")
            # DMC format: dmc-39-a-XX-... where XX is ATA code
            if f"-{ata_prefix}-" in path:
                filtered.append(doc)
        print(f"[RAG] ATA code filter '{ata_filter}': {len(filtered)}/{len(docs)} docs match")
        return filtered if filtered else docs
    
    return docs

def keyword_rerank_score(query: str, doc_text: str) -> float:
    """Calculate keyword-based reranking score to improve query-document matching.
    
    Returns a score adjustment (positive for boost, negative for penalty)
    based on keyword presence in the document.
    """
    query_lower = query.lower()
    doc_lower = doc_text.lower()
    boost = 0.0
    
    # Extract key concepts from query
    query_words = set(query_lower.split())
    
    # Boost for exact phrase matches
    if "does not start" in query_lower and "does not start" in doc_lower:
        boost += 0.15
    if "not starting" in query_lower and "not starting" in doc_lower:
        boost += 0.15
    if "will not start" in query_lower and ("will not start" in doc_lower or "does not start" in doc_lower):
        boost += 0.15
    
    # Boost for start-related procedures when query is about starting issues
    start_query_indicators = ["start", "starting", "does not start", "will not start", "not starting", "wont start"]
    if any(ind in query_lower for ind in start_query_indicators):
        # Boost documents about start procedures
        if "start sequence" in doc_lower or "start cycle" in doc_lower or "starting system" in doc_lower:
            boost += 0.12
        if "starter generator" in doc_lower and "start" in query_lower:
            boost += 0.10
        if "engine start" in doc_lower:
            boost += 0.08
        # Penalize documents about unrelated faults
        if "gen hot" in doc_lower or "overheat" in doc_lower or "temperature" in doc_lower:
            # Only penalize if query doesn't mention these
            if "hot" not in query_lower and "overheat" not in query_lower and "temperature" not in query_lower:
                boost -= 0.12
    
    # Boost for fault isolation procedures matching the issue type
    if "fault isolation" in doc_lower:
        # Check if fault type matches query
        if "start" in query_lower and ("start" in doc_lower or "crank" in doc_lower):
            boost += 0.10
        if "hot" in query_lower and "hot" in doc_lower:
            boost += 0.10
    
    # Boost for AWDP wiring diagrams when electrical query
    is_awdp_doc = "awdp" in doc_lower or "wiring diagram" in doc_lower or "wiring data" in doc_lower
    if is_awdp_doc:
        if any(w in query_lower for w in ["electrical", "wiring", "wire", "connector", "pin", "circuit"]):
            boost += 0.12
        # For generator queries, AWDP is useful for wiring troubleshooting
        if "generator" in query_lower or "starter" in query_lower:
            boost += 0.08
        # For fault isolation, wiring diagrams are essential
        if "fault" in query_lower or "does not" in query_lower or "not working" in query_lower:
            boost += 0.06
    
    return boost

@app.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """Query the RAG system with a maintenance question."""
    start_time = time.time()

    if not index_loaded:
        raise HTTPException(status_code=503, detail="Index not loaded. Call /reload-index first.")

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    # Get query embedding
    query_embedding = get_query_embedding(request.query)
    if not query_embedding:
        raise HTTPException(status_code=500, detail="Failed to generate query embedding")

    # Apply training material filter if specified
    docs_to_search = embeddings_index
    if request.ata_filter:
        docs_to_search = filter_documents_by_training_material(embeddings_index, request.ata_filter)
        print(f"[RAG] Filtered to {len(docs_to_search)} docs for filter: {request.ata_filter}")

    # Find most similar documents with keyword reranking
    similarities = []
    for doc in docs_to_search:
        base_sim = cosine_similarity(query_embedding, doc.get("embedding", []))
        # Apply keyword reranking
        keyword_boost = keyword_rerank_score(request.query, doc.get("text", ""))
        adjusted_sim = base_sim + keyword_boost
        similarities.append((adjusted_sim, base_sim, doc))

    similarities.sort(reverse=True, key=lambda x: x[0])
    top_docs = [(adj_sim, doc) for adj_sim, base_sim, doc in similarities[:request.top_k] if adj_sim > 0.0]
    
    # Log reranking effect
    if len(similarities) > 0:
        print(f"[RAG] Reranking applied. Top doc adjusted score: {similarities[0][0]:.4f} (base: {similarities[0][1]:.4f})")
    
    # Ensure AWDP documents are included for electrical/generator queries
    query_lower = request.query.lower()
    needs_awdp = any(w in query_lower for w in ["generator", "starter", "electrical", "wiring", "connector"])
    
    # Check both path AND text for AWDP references (AWDP ref can be in text content)
    def is_awdp_doc(doc):
        path = doc.get("doc_path", "").lower()
        text = doc.get("text", "").lower()[:1000]
        return "39-a-awdp" in path or "39-a-awdp" in text or "wiring diagram" in text
    
    has_awdp_in_top = any(is_awdp_doc(doc) for _, doc in top_docs)
    
    if needs_awdp and not has_awdp_in_top:
        # Search ALL documents for AWDP (checking text content, not just path)
        awdp_candidates = []
        for adj_sim, base_sim, doc in similarities:
            if is_awdp_doc(doc):
                awdp_candidates.append((adj_sim, doc))
        
        if awdp_candidates:
            # Sort by similarity and add the best AWDP doc
            awdp_candidates.sort(reverse=True, key=lambda x: x[0])
            best_awdp = awdp_candidates[0]
            top_docs.append(best_awdp)
            print(f"[RAG] Injected AWDP document: {best_awdp[1].get('doc_path', '')[-60:]} (score: {best_awdp[0]:.4f})")
        else:
            print(f"[RAG] No AWDP documents found in ATA {request.ata_filter or 'all'}")

    # Build document matches with content for CrewAI compatibility
    document_matches = []
    references = []
    primary_ata = ""

    for sim, doc in top_docs:
        doc_path = doc.get("doc_path", "unknown")
        ata_id = format_ata_identifier(doc_path)
        doc_text = doc.get("text", "")

        if not primary_ata and ata_id:
            primary_ata = ata_id

        references.append(f"ATA {ata_id}: {doc_path}")

        match = DocumentMatch(
            doc_path=doc_path,
            ata_identifier=ata_id,
            similarity_score=round(sim, 4),
            content=doc_text[:4000],  # Increased to capture numerical values (torques, specs)
            text_snippet=doc_text[:1000] if request.include_context else None
        )
        document_matches.append(match)

    # Generate response (skip if skip_gpt=True for faster response)
    retrieved_docs = [doc for _, doc in top_docs]
    if request.skip_gpt or len(document_matches) == 0:
        # Fast path: return documents without GPT generation
        answer = f"Found {len(document_matches)} matching documents for: {request.query[:100]}"
    else:
        # Full path: generate GPT response (slower)
        answer = generate_maintenance_response(request.query, retrieved_docs)

    processing_time = (time.time() - start_time) * 1000

    print(f"DEBUG: Returning {len(document_matches)} documents for query: {request.query[:50]}...")
    
    return QueryResponse(
        query=request.query,
        answer=answer,
        ata=primary_ata,
        references=references,
        documents=document_matches,
        chunks=document_matches,  # Alias for self-test compatibility
        processing_time_ms=round(processing_time, 2),
        model_used="gpt-4-turbo"
    )

# ======================================================================
# MAIN ENTRY POINT
# ======================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("RAG_API_PORT", "8000"))
    print(f"Starting AW139 RAG API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
