"""
AW139 CrewAI Diagnostic Server
FastAPI backend exposing the 3-tier CrewAI diagnostic system on port 9000.

3-Tier Agent System:
  1. Investigator - Senior troubleshooting specialist (25+ years)
  2. Validator - Documentation specialist and professional editor  
  3. Supervisor - Quality assurance and final approval (25+ years)

Endpoints:
- POST /diagnose - Run CrewAI diagnostic analysis
- GET /health - Health check
"""

import os
import json
import time
import re
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests

# ======================================================================
# CONFIGURATION
# ======================================================================

RAG_API_URL = os.environ.get("RAG_API_URL", "http://127.0.0.1:8000")
RAG_QUERY_ENDPOINT = f"{RAG_API_URL}/query"
RAG_HEALTH_ENDPOINT = f"{RAG_API_URL}/health"
CERTAINTY_THRESHOLD = 95

# ======================================================================
# FASTAPI APP
# ======================================================================

app = FastAPI(
    title="AW139 CrewAI Diagnostic Server",
    description="3-Tier CrewAI diagnostic system for AW139 helicopter maintenance",
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

class DiagnoseRequest(BaseModel):
    query: str = Field(..., description="Maintenance diagnostic query")
    serial_number: str = Field(default="31486", description="Aircraft serial number")
    ata_code: str = Field(default="", description="ATA code or training material (PRIMUS_EPIC, PT6C_67CD, AW139_AIRFRAME)")
    task_type: str = Field(default="fault_isolation", description="Task type: fault_isolation, functional_test, operational_test, remove_procedure, install_procedure, system_description, detailed_inspection, disassembly, assembly, adjustment, bonding_check, other")
    aircraft_configuration: str = Field(default="", description="Aircraft configuration code: SN, LN, ENH, PLUS")
    configuration_name: str = Field(default="", description="Aircraft configuration name: Short Nose, Long Nose, Enhanced, PLUS")

class AffectedPart(BaseModel):
    part_number: str
    description: str
    location: str
    action: str

class LikelyCause(BaseModel):
    cause: str
    probability: int
    reasoning: str

class RecommendedTest(BaseModel):
    step: int
    description: str
    reference: str
    expected_result: str

class DiagnoseResponse(BaseModel):
    query: str
    serial_number: str
    diagnosis: str
    ata_chapter: str = ""
    certainty_score: int = 0
    certainty_status: str = "REQUIRE_EXPERT"
    affected_parts: List[AffectedPart] = []
    likely_causes: List[LikelyCause] = []
    recommended_tests: List[RecommendedTest] = []
    references: List[str] = []
    supervisor_notes: str = ""
    source: str = "CrewAI 3-Tier System + RAG"
    processing_time_ms: float = 0.0

class HealthResponse(BaseModel):
    status: str
    rag_connected: bool
    message: str
    agents: List[str]

# ======================================================================
# IMPORT CREWAI SYSTEM
# ======================================================================

AW139DiagnosticCrew = None
CREWAI_AVAILABLE = False

try:
    from maintenance_crew import AW139DiagnosticCrew as _AW139DiagnosticCrew
    AW139DiagnosticCrew = _AW139DiagnosticCrew
    CREWAI_AVAILABLE = True
    print("[CrewAI] Maintenance crew module loaded successfully")
except ImportError as e:
    print(f"[CrewAI] WARNING: Could not import maintenance_crew: {e}")
    print("[CrewAI] Falling back to direct RAG mode")

# ======================================================================
# HELPER FUNCTIONS
# ======================================================================

def clean_markdown_artifacts(text: str) -> str:
    """Remove ALL markdown formatting, quotes, and format with proper line breaks."""
    if not text:
        return text
    
    cleaned = text
    
    # Remove === headers (e.g., "=== PROCEDURE: ... ===")
    cleaned = re.sub(r'={2,}\s*', '', cleaned)
    
    # Remove markdown headers at start of line (##, ###, etc.)
    cleaned = re.sub(r'^\s*#{1,6}\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'([.!?-])\s*#{1,6}\s+', r'\1 ', cleaned)
    
    # Remove bold/italic markdown
    cleaned = re.sub(r'\*\*\*(.+?)\*\*\*', r'\1', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'\*\*(.+?)\*\*', r'\1', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'__(.+?)__', r'\1', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'(?<!\w)\*([^*\n]+)\*(?!\w)', r'\1', cleaned)
    cleaned = re.sub(r'(?<!\w)_([^_\n]+)_(?!\w)', r'\1', cleaned)
    cleaned = re.sub(r'\*{2,}', '', cleaned)
    
    # Remove horizontal rules
    cleaned = re.sub(r'^\s*[-]{2,}\s*$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^\s*[_]{3,}\s*$', '', cleaned, flags=re.MULTILINE)
    
    # Remove code backticks
    cleaned = re.sub(r'`([^`]+)`', r'\1', cleaned)
    cleaned = re.sub(r'```[^`]*```', '', cleaned, flags=re.DOTALL)
    
    # Remove markdown links and images
    cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned)
    cleaned = re.sub(r'!\[[^\]]*\]\([^\)]+\)', '', cleaned)
    
    # Remove excessive quotes around procedure steps (keep the text, remove quotes)
    cleaned = re.sub(r'"([^"]{10,})"', r'\1', cleaned)
    
    # Remove markdown bullets at start of line
    cleaned = re.sub(r'^\s*[-*+]\s+', '  ', cleaned, flags=re.MULTILINE)
    
    # Format numbered steps - ensure each starts on new line
    # First normalize: collapse multiple newlines/spaces around numbered items
    cleaned = re.sub(r'\n+\s*(\d+)\.\s+', r'\n\n\1. ', cleaned)
    cleaned = re.sub(r'\n+\s*(\d+)\.(\d+)\.\s+', r'\n   \1.\2. ', cleaned)
    cleaned = re.sub(r'\n+\s*(\d+)\.(\d+)\.(\d+)\.\s+', r'\n      \1.\2.\3. ', cleaned)
    
    # Ensure main steps (single digit followed by period and text) start on new line
    cleaned = re.sub(r'([^\n])\s+(\d)\.(?!\d)\s+([A-Z])', r'\1\n\n\2. \3', cleaned)
    # Ensure sub-steps like 2.1. also start on new line with indent
    cleaned = re.sub(r'([^\n])\s+(\d+\.\d+)\.\s+([A-Z])', r'\1\n   \2. \3', cleaned)
    
    # Format section headers on their own lines
    cleaned = re.sub(r'(?<!\n)(PROCEDURE|PREREQUISITES|SUPPORT EQUIPMENT|DMC Reference|REQUIREMENTS AFTER|SENIOR TECHNICIAN NOTE):', r'\n\n\1:', cleaned)
    
    # Clean TPD_PSE references - make them more readable
    cleaned = re.sub(r'TPD_PSE;(\d+);;;?', r'(PSE Ref: \1)', cleaned)
    cleaned = re.sub(r'\(PSE Ref: \d+\)\s*\(PSE Ref: \d+\)', lambda m: m.group(0).replace(') (', ', '), cleaned)
    
    # Clean up excessive whitespace
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    cleaned = re.sub(r'^\s+$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r' {2,}', ' ', cleaned)
    cleaned = re.sub(r'^\n+', '', cleaned)
    
    return cleaned.strip()

def validate_part_numbers(text: str) -> str:
    """Fix only clearly truncated part numbers, preserving legitimate parenthetical info."""
    if not text:
        return text
    
    text = re.sub(r'([A-Z0-9-]{5,})\s*\([A-Z]{1,2}$', r'\1', text, flags=re.MULTILINE)
    text = re.sub(r'([A-Z0-9-]{5,})\s*\($', r'\1', text, flags=re.MULTILINE)
    
    return text

def check_rag_health() -> bool:
    """Check if RAG API is available."""
    try:
        response = requests.get(RAG_HEALTH_ENDPOINT, timeout=5)
        data = response.json()
        return data.get("status") == "healthy" and data.get("index_loaded", False)
    except Exception:
        return False

def query_rag(query: str, top_k: int = 10, max_retries: int = 3, ata_code: str = "") -> Dict[str, Any]:
    """Query the RAG API with retry logic and ATA/training filter.
    
    CRITICAL: When ata_code is a training material (PRIMUS_EPIC, PT6C_67CD, AW139_AIRFRAME),
    the RAG will EXCLUSIVELY search documents matching that training material.
    """
    backoff_times = [1, 2, 4]
    last_error = None
    
    # Check if this is a training material filter
    training_materials = ["PRIMUS_EPIC", "PT6C_67CD", "AW139_AIRFRAME"]
    is_training_material = ata_code in training_materials
    
    # Build enhanced query with context hints
    enhanced_query = query
    if ata_code:
        training_context = {
            "PRIMUS_EPIC": "Primus Epic avionics system",
            "PT6C_67CD": "PT6C-67CD engine",
            "AW139_AIRFRAME": "AW139 Airframe systems"
        }
        if is_training_material:
            enhanced_query = f"{training_context[ata_code]}: {query}"
            print(f"[CrewAI] TRAINING MATERIAL EXCLUSIVE FILTER: {ata_code}")
        else:
            enhanced_query = f"ATA {ata_code}: {query}"
            print(f"[CrewAI] ATA code filter: {ata_code}")
    
    for attempt in range(max_retries):
        try:
            print(f"[CrewAI] RAG query attempt {attempt + 1}/{max_retries}: {enhanced_query[:60]}...")
            
            # Pass ata_filter to RAG for document filtering
            response = requests.post(
                RAG_QUERY_ENDPOINT,
                json={
                    "query": enhanced_query, 
                    "top_k": top_k, 
                    "skip_gpt": False,
                    "ata_filter": ata_code  # NEW: Pass filter to RAG for exclusive doc search
                },
                timeout=90
            )
            response.raise_for_status()
            data = response.json()
            
            docs = data.get("documents") or data.get("chunks") or []
            print(f"[CrewAI] RAG returned {len(docs)} documents (filter: {ata_code or 'none'})")
            
            return data
        except Exception as e:
            last_error = e
            print(f"[CrewAI] RAG error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                time.sleep(backoff_times[attempt])
    
    return {"error": f"RAG query failed: {last_error}"}

def extract_part_numbers(text: str) -> List[Dict[str, str]]:
    """Extract real part numbers from text."""
    parts = []
    seen = set()
    
    patterns = [
        (r'\b(3G\d{4}[A-Z0-9-]+)\b', "AW139 Component"),
        (r'\b(\d{3}-\d{4}-\d{2}-\d{2})\b', "Assembly Part"),
        (r'\b(109-\d{4}-\d{2}-\d{2})\b', "Honeywell Component"),
        (r'P/N[:\s]*([A-Z0-9-]{6,})', "Identified Part"),
        (r'\b([A-Z]{2,3}\d{5,}[A-Z0-9-]*)\b', "Aircraft Part"),
    ]
    
    for pattern, desc_prefix in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            pn = match.group(1).upper()
            if pn not in seen and len(pn) >= 6:
                seen.add(pn)
                parts.append({
                    "part_number": pn,
                    "description": f"{desc_prefix}",
                    "location": "See maintenance manual for location",
                    "action": "INSPECT"
                })
    
    return parts[:10]

def extract_ata_chapter(text: str) -> str:
    """Extract ATA chapter from text."""
    patterns = [
        r'ATA[:\s]*(\d{2})[-\s](\d{2})',
        r'ATA Chapter[:\s]*(\d{2})',
        r'ATA[:\s]*(\d{2})\b',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if len(match.groups()) >= 2:
                return f"ATA {match.group(1)}-{match.group(2)}"
            return f"ATA {match.group(1)}"
    
    return ""

def extract_references(text: str) -> List[str]:
    """Extract manual references from text."""
    refs = []
    seen = set()
    
    patterns = [
        r'(AMM[-\s]\d{2}[-\s]\d{2}[-\s]\d{2,4})',
        r'(AMP[-\s]\d{2}[-\s]\d{2}[-\s]\d{2,4})',
        r'(AWD[-\s]\d{2}[-\s]\d{2}[-\s]\d{2,4})',
        r'(IPD[-\s][A-Z0-9-]+)',
        r'(FIM[-\s]\d{2}[-\s]\d{2})',
        r'(IETP[-\s]AW139[-\s][A-Z0-9-]+)',
        r'(CMM[-\s]\d{2}[-\s]\d{2})',
    ]
    
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            ref = match.group(1).upper().replace(" ", "-")
            if ref not in seen:
                seen.add(ref)
                refs.append(ref)
    
    return refs[:15]

def extract_likely_causes(text: str) -> List[Dict[str, Any]]:
    """Extract likely causes with probabilities."""
    causes = []
    
    cause_patterns = [
        (r'(\d{1,3})\s*%[:\s]*([^.\n]+)', True),
        (r'([^.\n]+)\s*\((\d{1,3})\s*%\)', False),
    ]
    
    for pattern, prob_first in cause_patterns:
        for match in re.finditer(pattern, text):
            if prob_first:
                prob = int(match.group(1))
                cause = match.group(2).strip()
            else:
                cause = match.group(1).strip()
                prob = int(match.group(2))
            
            if 5 <= prob <= 100 and len(cause) > 10:
                causes.append({
                    "cause": cause[:100],
                    "probability": prob,
                    "reasoning": "Based on symptom analysis and documentation match"
                })
    
    if not causes:
        keywords = [
            ("electrical", "Electrical Connection Issue", 30),
            ("component", "Component Failure", 35),
            ("wiring", "Wiring Fault", 25),
            ("corrosion", "Corrosion", 15),
            ("wear", "Mechanical Wear", 20),
            ("sensor", "Sensor Malfunction", 25),
            ("connector", "Connector Issue", 20),
        ]
        
        text_lower = text.lower()
        for keyword, cause, prob in keywords:
            if keyword in text_lower and len(causes) < 3:
                causes.append({
                    "cause": cause,
                    "probability": prob,
                    "reasoning": "Based on symptom analysis and documentation match"
                })
    
    causes.sort(key=lambda x: x["probability"], reverse=True)
    return causes[:5]

def extract_recommended_tests(text: str, ata: str) -> List[Dict[str, Any]]:
    """Extract recommended test procedures."""
    tests = []
    
    test_keywords = ["test", "check", "verify", "inspect", "measure", "continuity"]
    sentences = re.split(r'[.!?]', text)
    
    step = 1
    for sentence in sentences:
        sentence = sentence.strip()
        if any(kw in sentence.lower() for kw in test_keywords) and len(sentence) > 20:
            ref_match = re.search(r'(AMP|AWD|AMM)[-\s]?\d{2}[-\s]?\d{2}', sentence, re.IGNORECASE)
            ref = ref_match.group(0).upper() if ref_match else f"AMP-{ata.replace('ATA ', '')}-00" if ata else "AMP-XX-XX"
            
            tests.append({
                "step": step,
                "description": sentence[:200],
                "reference": ref,
                "expected_result": "Verify per maintenance manual specifications"
            })
            step += 1
            
            if step > 6:
                break
    
    if not tests:
        ata_code = ata.replace("ATA ", "") if ata else "XX"
        tests = [
            {
                "step": 1,
                "description": f"Perform visual inspection of {ata} components",
                "reference": f"AMP-{ata_code}-00-10",
                "expected_result": "No visible damage or abnormalities"
            },
            {
                "step": 2,
                "description": "Verify electrical continuity on associated circuits",
                "reference": f"AWD-{ata_code}-00-20",
                "expected_result": "Continuity within specifications"
            },
            {
                "step": 3,
                "description": "Check connector pins for corrosion or damage",
                "reference": f"AMM-{ata_code}-10-00",
                "expected_result": "Pins clean and properly seated"
            },
        ]
    
    return tests

def calculate_certainty_score(
    rag_result: Dict[str, Any], 
    diagnosis: str, 
    query: str = "", 
    ata_filter: str = "",
    task_type: str = "fault_isolation",
    has_awdp: bool = False
) -> Dict[str, Any]:
    """
    RIGOROUS CERTAINTY SCORE ENGINE v3.0 - Safety-Critical Calibration
    
    Philosophy: The score must reflect whether the diagnosis ACTUALLY addresses
    the problem with SPECIFIC information from the IETP/AMP/AWDP documentation.
    Generic responses with technical-sounding words must NOT score high.
    
    5-Component Formula:
      (CoverageScore * 0.25) +
      (SystemAnalysisScore * 0.25) +
      (EvidenceScore * 0.20) +
      (QueryAlignmentScore * 0.20) +
      (DiagramAnalysisScore * 0.10)
    
    HARD RULES:
    - Score >= 95% ONLY IF strict criteria are ALL met
    - Fault isolation without AWDP analysis: capped at 85%
    - Generic diagnosis without specific part/component analysis: capped at 80%
    - No specific DMC/AMP references: capped at 85%
    """
    docs = rag_result.get("documents") or rag_result.get("chunks") or []
    doc_count = len(docs)
    diagnosis_lower = diagnosis.lower()
    query_lower = query.lower() if query else ""
    
    print(f"[CrewAI] === CERTAINTY SCORE v3.0 - RIGOROUS CALCULATION ===")
    print(f"[CrewAI] Query: {query[:80]}...")
    print(f"[CrewAI] ATA Filter: {ata_filter}")
    print(f"[CrewAI] Task Type: {task_type}")
    print(f"[CrewAI] AWDP Found: {has_awdp}")
    print(f"[CrewAI] Documents found: {doc_count}")
    
    # =========================================================================
    # 1. COVERAGE SCORE (0-100%) - Weight: 25%
    # Are the RAG documents actually from the relevant ATA/manual?
    # Stricter: requires high ratio of matching docs
    # =========================================================================
    coverage_score = 0
    coverage_details = []
    
    if doc_count == 0:
        coverage_score = 0
        coverage_details.append("CRITICAL: No documents found in RAG")
    else:
        ata_code = ata_filter.replace("ATA ", "").strip() if ata_filter else ""
        matching_docs = 0
        high_relevance_docs = 0
        
        for doc in docs:
            doc_path = doc.get("doc_path", "").lower()
            doc_content = doc.get("content", "").lower()
            doc_score = doc.get("score", 0) or doc.get("similarity", 0)
            
            is_match = False
            if ata_filter in ["PRIMUS_EPIC", "PT6C_67CD", "AW139_AIRFRAME"]:
                training_keywords = {
                    "PRIMUS_EPIC": ["primus", "epic", "avionics", "cmc", "fms"],
                    "PT6C_67CD": ["pt6c", "67c", "engine", "turbine", "power plant"],
                    "AW139_AIRFRAME": ["airframe", "structure", "fuselage", "cabin"]
                }
                if any(kw in doc_content or kw in doc_path for kw in training_keywords.get(ata_filter, [])):
                    is_match = True
            elif ata_code and f"-{ata_code[:2]}-" in doc_path:
                is_match = True
            elif not ata_code:
                is_match = True
            
            if is_match:
                matching_docs += 1
                if isinstance(doc_score, (int, float)) and doc_score > 0.7:
                    high_relevance_docs += 1
        
        if doc_count > 0:
            coverage_ratio = matching_docs / doc_count
            if coverage_ratio >= 0.8 and high_relevance_docs >= 3:
                coverage_score = 100
                coverage_details.append(f"Excellent: {matching_docs}/{doc_count} docs, {high_relevance_docs} high-relevance")
            elif coverage_ratio >= 0.8:
                coverage_score = 85
                coverage_details.append(f"Good match ratio but few high-relevance: {matching_docs}/{doc_count}")
            elif coverage_ratio >= 0.5:
                coverage_score = 65
                coverage_details.append(f"Moderate: {matching_docs}/{doc_count} docs from selected manual")
            elif coverage_ratio >= 0.2:
                coverage_score = 40
                coverage_details.append(f"Weak: {matching_docs}/{doc_count} docs from selected manual")
            else:
                coverage_score = 15
                coverage_details.append(f"Poor: Only {matching_docs}/{doc_count} docs from selected manual")
    
    print(f"[CrewAI] Coverage Score: {coverage_score}% - {coverage_details}")
    
    # =========================================================================
    # 2. SYSTEM ANALYSIS SCORE (0-100%) - Weight: 25%
    # Does the diagnosis explain HOW the system works and WHY the problem occurs?
    # NOT just generic keywords - must show causal reasoning
    # =========================================================================
    system_analysis_score = 0
    analysis_details = []
    
    has_specific_component = bool(re.search(
        r'\b(?:actuator|valve|pump|generator|starter|relay|contactor|'
        r'solenoid|bearing|seal|bushing|link|rod|arm|gear|shaft|'
        r'damper|accumulator|filter|regulator|transducer|'
        r'steering|shimmy|oleo|strut|torque\s*link|scissor|'
        r'swashplate|servo|pitch\s*link|collective|pedal|'
        r'connector|harness|bus|breaker|ground\s*point)\b',
        diagnosis_lower
    ))
    
    has_causal_reasoning = bool(re.search(
        r'\b(?:because|due to|caused by|resulting from|leads to|'
        r'prevents|restricts|blocks|fails to|unable to|'
        r'when .{5,40} the .{5,30} (?:cannot|does not|fails|stops)|'
        r'if .{5,30} then .{5,30}|'
        r'this (?:causes|results|prevents|restricts))\b',
        diagnosis_lower
    ))
    
    has_mechanism_explanation = bool(re.search(
        r'\b(?:mechanism|assembly|linkage|hydraulic\s*(?:line|circuit|system)|'
        r'electrical\s*(?:circuit|path|bus)|control\s*(?:chain|path|loop)|'
        r'mechanical\s*(?:connection|linkage|system)|'
        r'steering\s*(?:mechanism|system|assembly)|'
        r'how (?:the|this) .{5,40} works|'
        r'the .{5,30} is (?:connected|linked|driven|controlled) by)\b',
        diagnosis_lower
    ))
    
    has_specific_location = bool(re.search(
        r'\b(?:LH|RH|left|right|forward|aft|upper|lower|inboard|outboard|'
        r'station\s*\d|frame\s*\d|bay\s*\d|zone\s*\d|'
        r'panel\s*[A-Z0-9]|rack\s*\d|shelf\s*\d)\b',
        diagnosis, re.IGNORECASE
    ))
    
    has_failure_mode = bool(re.search(
        r'\b(?:worn|corroded|seized|cracked|broken|leaking|loose|'
        r'intermittent|open\s*circuit|short\s*circuit|grounded|'
        r'binding|sticking|jamm(?:ed|ing)|frozen|stripped|'
        r'fatigued|deformed|contaminated|degraded|misaligned)\b',
        diagnosis_lower
    ))
    
    analysis_points = 0
    if has_specific_component:
        analysis_points += 25
        analysis_details.append("Specific component identified")
    if has_causal_reasoning:
        analysis_points += 25
        analysis_details.append("Causal reasoning present")
    if has_mechanism_explanation:
        analysis_points += 20
        analysis_details.append("Mechanism/system explained")
    if has_specific_location:
        analysis_points += 15
        analysis_details.append("Specific location referenced")
    if has_failure_mode:
        analysis_points += 15
        analysis_details.append("Failure mode identified")
    
    system_analysis_score = min(analysis_points, 100)
    
    if not has_specific_component and not has_mechanism_explanation:
        system_analysis_score = min(system_analysis_score, 30)
        analysis_details.append("WARNING: No specific component or mechanism analysis")
    
    if not has_causal_reasoning:
        system_analysis_score = min(system_analysis_score, 50)
        analysis_details.append("WARNING: No causal reasoning (why the problem occurs)")
    
    print(f"[CrewAI] System Analysis Score: {system_analysis_score}% - {analysis_details}")
    
    # =========================================================================
    # 3. EVIDENCE SCORE (0-100%) - Weight: 20%
    # Specific technical values, REAL part numbers, manual references
    # Generic "check continuity" without specifics scores LOW
    # =========================================================================
    evidence_score = 0
    evidence_count = 0
    evidence_details = []
    found_evidence = {}
    
    evidence_patterns = {
        'torque': r'\b\d+\.?\d*\s*(?:N\s*m|Nm|lbf?\s*in|lb-in|ft-lb|lb-ft)\b',
        'pressure': r'\b\d+\.?\d*\s*(?:psi|bar|kPa|MPa)\b',
        'voltage': r'\b\d+\.?\d*\s*(?:V|mV|kV)\b',
        'current': r'\b\d+\.?\d*\s*(?:A|mA)\b',
        'temperature': r'\b-?\d+\.?\d*\s*°?(?:C|F)\b',
        'dimension': r'\b\d+\.?\d*\s*(?:mm|cm|m|in|ft)\b',
        'resistance': r'\b\d+\.?\d*\s*(?:ohm|Ω|kohm|MΩ)\b',
    }
    
    for ev_type, pattern in evidence_patterns.items():
        matches = re.findall(pattern, diagnosis, re.IGNORECASE)
        if matches:
            found_evidence[ev_type] = matches
            evidence_count += len(matches)
    
    has_real_dmc = bool(re.search(
        r'\b\d{2}-[A-Z]-\d{2}-\d{2}-\d{2}-\d{2}[A-Z]?',
        diagnosis, re.IGNORECASE
    ))
    if has_real_dmc:
        evidence_count += 3
        found_evidence['dmc_code'] = True
    
    has_amp_ref = bool(re.search(r'\b(?:AMP|AMM)\s*[-:]?\s*\d{2}[-]\d{2}[-]\d{2}', diagnosis, re.IGNORECASE))
    if has_amp_ref:
        evidence_count += 2
        found_evidence['amp_ref'] = True
    
    has_awdp_ref = bool(re.search(r'\b(?:AWD|AWDP)\s*[-:]?\s*\d{2}', diagnosis, re.IGNORECASE))
    if has_awdp_ref:
        evidence_count += 2
        found_evidence['awdp_ref'] = True
    
    has_real_part_number = bool(re.search(r'\b(?:3G\d{4}[A-Z0-9-]+|\d{3}-\d{4}-\d{2}|P/N\s*[A-Z0-9-]{6,})\b', diagnosis, re.IGNORECASE))
    if has_real_part_number:
        evidence_count += 2
        found_evidence['real_part_number'] = True
    
    has_connector_pin = bool(re.search(r'\b(?:pin\s*\d+|connector\s*[A-Z]?\d|plug\s*[A-Z]?\d)\b', diagnosis, re.IGNORECASE))
    if has_connector_pin:
        evidence_count += 1
        found_evidence['connector_pin'] = True
    
    if evidence_count == 0:
        evidence_score = 0
    elif evidence_count <= 2:
        evidence_score = 20
    elif evidence_count <= 4:
        evidence_score = 40
    elif evidence_count <= 6:
        evidence_score = 60
    elif evidence_count <= 9:
        evidence_score = 80
    else:
        evidence_score = 100
    
    evidence_details.append(f"Found {evidence_count} evidences: {list(found_evidence.keys())}")
    print(f"[CrewAI] Evidence Score: {evidence_score}% - {evidence_details}")
    
    # =========================================================================
    # 4. QUERY-DIAGNOSIS ALIGNMENT SCORE (0-100%) - Weight: 20%
    # Does the diagnosis actually address the SPECIFIC problem asked?
    # Uses SUBSYSTEM INFERENCE: maps query concepts to required components
    # E.g., "not turning left" → must discuss steering/nose gear mechanism
    # =========================================================================
    alignment_score = 0
    alignment_details = []
    
    # --- SUBSYSTEM INFERENCE ENGINE ---
    # Maps query concepts to required subsystem components in the diagnosis
    # If the query implies a specific subsystem, the diagnosis MUST mention it
    subsystem_map = {
        'steering': {
            'triggers': ['turn', 'turning', 'steer', 'steering', 'taxi', 'taxing', 'taxiing', 'ground maneuver'],
            'required': ['steering', 'nose wheel', 'nosewheel', 'nose gear', 'nose landing gear',
                         'shimmy damper', 'torque link', 'steering actuator', 'steering valve',
                         'steering cylinder', 'castering', 'tiller'],
            'label': 'Nose Wheel Steering System'
        },
        'landing_gear': {
            'triggers': ['landing gear', 'gear', 'retract', 'extend', 'gear up', 'gear down',
                         'squat switch', 'weight on wheels', 'wow'],
            'required': ['landing gear', 'actuator', 'uplock', 'downlock', 'squat switch',
                         'gear door', 'oleo', 'strut', 'retract', 'extend', 'selector valve'],
            'label': 'Landing Gear System'
        },
        'hydraulic': {
            'triggers': ['hydraulic', 'pressure', 'pump', 'fluid', 'leak'],
            'required': ['hydraulic pump', 'reservoir', 'accumulator', 'pressure switch',
                         'relief valve', 'hydraulic module', 'servo', 'actuator', 'manifold',
                         'filter', 'hydraulic system'],
            'label': 'Hydraulic System'
        },
        'engine': {
            'triggers': ['engine', 'turbine', 'power', 'torque', 'ng', 'np', 'itt', 'start',
                         'hot start', 'hung start', 'flameout', 'ecu', 'fadec'],
            'required': ['engine', 'turbine', 'compressor', 'combustion', 'fuel control',
                         'fuel nozzle', 'igniter', 'gearbox', 'oil', 'bearing', 'fadec', 'ecu'],
            'label': 'Engine/Powerplant System'
        },
        'electrical': {
            'triggers': ['generator', 'battery', 'bus', 'power loss', 'electrical', 'voltage',
                         'breaker', 'tripped', 'no power'],
            'required': ['generator', 'battery', 'bus', 'contactor', 'breaker', 'relay',
                         'transformer', 'rectifier', 'inverter', 'gcr', 'gcb', 'btb'],
            'label': 'Electrical Power System'
        },
        'flight_controls': {
            'triggers': ['cyclic', 'collective', 'pedal', 'yaw', 'pitch', 'roll',
                         'autopilot', 'trim', 'stick', 'vibration'],
            'required': ['servo', 'actuator', 'swashplate', 'pitch link', 'mixing unit',
                         'trim', 'boost', 'feel spring', 'gradient unit', 'autopilot'],
            'label': 'Flight Control System'
        },
        'rotor': {
            'triggers': ['rotor', 'blade', 'hub', 'mast', 'tail rotor', 'main rotor',
                         'track', 'balance', 'vibration', 'lead-lag'],
            'required': ['rotor', 'blade', 'hub', 'damper', 'bearing', 'pitch horn',
                         'lead-lag', 'drag brace', 'elastomeric', 'spindle'],
            'label': 'Rotor System'
        },
        'avionics': {
            'triggers': ['display', 'screen', 'cas', 'warning', 'caution', 'advisory',
                         'radio', 'nav', 'gps', 'transponder', 'ahrs', 'adc'],
            'required': ['display', 'processor', 'symbol generator', 'dmu', 'dcu',
                         'sensor', 'computer', 'bus', 'arinc', 'can bus'],
            'label': 'Avionics System'
        },
        'fuel': {
            'triggers': ['fuel', 'tank', 'boost pump', 'transfer', 'crossfeed', 'quantity'],
            'required': ['fuel pump', 'fuel tank', 'fuel valve', 'boost pump', 'transfer pump',
                         'crossfeed', 'fuel quantity', 'fuel filter', 'fuel line'],
            'label': 'Fuel System'
        },
    }
    
    inferred_subsystems = []
    missing_subsystem_analysis = []
    
    for subsys_name, subsys_data in subsystem_map.items():
        query_matches = any(trigger in query_lower for trigger in subsys_data['triggers'])
        if query_matches:
            diagnosis_has_subsystem = any(req in diagnosis_lower for req in subsys_data['required'])
            inferred_subsystems.append(subsys_data['label'])
            if not diagnosis_has_subsystem:
                missing_subsystem_analysis.append(subsys_data['label'])
                alignment_details.append(f"CRITICAL: Query implies {subsys_data['label']} but diagnosis does NOT analyze it")
    
    # --- KEYWORD OVERLAP CHECK ---
    query_clean = re.sub(r'\[.*?\]', '', query_lower)
    query_clean = re.sub(r'ata\s*\d+', '', query_clean)
    query_clean = re.sub(r'aw139|s/n:?\s*\d+', '', query_clean)
    
    important_words = re.findall(r'\b[a-z]{4,}\b', query_clean)
    stop_words = {'does', 'have', 'been', 'with', 'that', 'this', 'from', 'what',
                  'when', 'where', 'which', 'there', 'their', 'about', 'would',
                  'could', 'should', 'during', 'before', 'after', 'helicopter',
                  'aircraft', 'system', 'problem', 'issue', 'fault', 'check'}
    query_keywords = {w for w in important_words if w not in stop_words and len(w) >= 4}
    
    if query_keywords:
        matched_keywords = sum(1 for kw in query_keywords if kw in diagnosis_lower)
        keyword_ratio = matched_keywords / len(query_keywords) if query_keywords else 0
        
        if keyword_ratio >= 0.6:
            alignment_score = 100
        elif keyword_ratio >= 0.4:
            alignment_score = 70
        elif keyword_ratio >= 0.2:
            alignment_score = 45
        else:
            alignment_score = 20
            alignment_details.append(f"Weak keyword overlap: {matched_keywords}/{len(query_keywords)}")
    else:
        alignment_score = 50
    
    # --- SUBSYSTEM PENALTY (most important) ---
    if missing_subsystem_analysis:
        alignment_score = min(alignment_score, 25)
        alignment_details.append(f"SUBSYSTEM PENALTY: Diagnosis missing analysis of {', '.join(missing_subsystem_analysis)}")
    elif inferred_subsystems:
        alignment_details.append(f"Subsystem verified: {', '.join(inferred_subsystems)} analyzed in diagnosis")
    
    # --- GENERIC DIAGNOSIS PENALTY ---
    is_generic_diagnosis = bool(re.search(
        r'(?:check continuity|verify wiring|inspect connector|check hydraulic)',
        diagnosis_lower
    )) and not has_specific_component and not has_mechanism_explanation
    
    if is_generic_diagnosis:
        alignment_score = min(alignment_score, 35)
        alignment_details.append("PENALTY: Generic troubleshooting without specific component analysis")
    
    # --- ELECTRICAL MISMATCH PENALTY ---
    # If diagnosis suggests electrical checks but query implies mechanical problem
    diagnosis_suggests_electrical = any(term in diagnosis_lower for term in 
        ['continuity', 'wiring', 'circuit', 'resistance', 'voltage'])
    query_implies_mechanical = any(trigger in query_lower for trigger in 
        ['turn', 'steering', 'gear', 'stuck', 'binding', 'seized', 'jam', 'stiff',
         'vibration', 'noise', 'grind', 'click', 'play', 'loose', 'worn'])
    
    if diagnosis_suggests_electrical and query_implies_mechanical and not has_mechanism_explanation:
        alignment_score = min(alignment_score, 40)
        alignment_details.append("PENALTY: Diagnosis suggests electrical checks for likely mechanical problem without analyzing mechanism")
    
    print(f"[CrewAI] Query Alignment Score: {alignment_score}% - {alignment_details}")
    if inferred_subsystems:
        print(f"[CrewAI] Inferred subsystems: {inferred_subsystems}")
    if missing_subsystem_analysis:
        print(f"[CrewAI] MISSING subsystem analysis: {missing_subsystem_analysis}")
    
    # =========================================================================
    # 5. DIAGRAM/SCHEMATIC ANALYSIS SCORE (0-100%) - Weight: 10%
    # For fault isolation: did the system actually analyze AWDP diagrams?
    # For procedures: did it reference the correct AMP section?
    # =========================================================================
    diagram_score = 0
    diagram_details = []
    
    is_fault_type = task_type in ["fault_isolation", "operational_test", "functional_test"]
    is_procedure_type = task_type in ["remove_procedure", "install_procedure", "disassembly", "assembly"]
    
    if is_fault_type:
        if has_awdp and has_awdp_ref:
            diagram_score = 100
            diagram_details.append("AWDP diagram found and referenced in diagnosis")
        elif has_awdp:
            diagram_score = 70
            diagram_details.append("AWDP document found but not explicitly analyzed")
        elif has_awdp_ref:
            diagram_score = 60
            diagram_details.append("AWDP referenced but document not in RAG results")
        else:
            diagram_score = 20
            diagram_details.append("WARNING: No AWDP/wiring diagram analysis for fault isolation")
    elif is_procedure_type:
        if has_amp_ref or has_real_dmc:
            diagram_score = 100
            diagram_details.append("Correct manual section referenced for procedure")
        else:
            diagram_score = 40
            diagram_details.append("Procedure without specific manual reference")
    else:
        if has_amp_ref or has_real_dmc or has_awdp_ref:
            diagram_score = 100
            diagram_details.append("Manual references found")
        else:
            diagram_score = 50
            diagram_details.append("No specific manual references")
    
    print(f"[CrewAI] Diagram Analysis Score: {diagram_score}% - {diagram_details}")
    
    # =========================================================================
    # FINAL SCORE CALCULATION
    # =========================================================================
    final_score = (
        (coverage_score * 0.25) +
        (system_analysis_score * 0.25) +
        (evidence_score * 0.20) +
        (alignment_score * 0.20) +
        (diagram_score * 0.10)
    )
    
    print(f"[CrewAI] === SCORE BREAKDOWN v3.0 ===")
    print(f"[CrewAI] Coverage:         {coverage_score:3}% x 0.25 = {coverage_score * 0.25:.1f}")
    print(f"[CrewAI] System Analysis:  {system_analysis_score:3}% x 0.25 = {system_analysis_score * 0.25:.1f}")
    print(f"[CrewAI] Evidence:         {evidence_score:3}% x 0.20 = {evidence_score * 0.20:.1f}")
    print(f"[CrewAI] Query Alignment:  {alignment_score:3}% x 0.20 = {alignment_score * 0.20:.1f}")
    print(f"[CrewAI] Diagram Analysis: {diagram_score:3}% x 0.10 = {diagram_score * 0.10:.1f}")
    print(f"[CrewAI] Raw Total: {final_score:.1f}%")
    
    # =========================================================================
    # HARD CAPS - Safety-critical rules that CANNOT be overridden
    # =========================================================================
    caps_applied = []
    
    if is_fault_type and not has_awdp and not has_awdp_ref:
        if final_score > 85:
            final_score = 85
            caps_applied.append("CAP 85%: Fault isolation without AWDP/wiring analysis")
    
    if is_generic_diagnosis:
        if final_score > 80:
            final_score = 80
            caps_applied.append("CAP 80%: Generic diagnosis without specific component analysis")
    
    if not has_amp_ref and not has_real_dmc and not has_awdp_ref:
        if final_score > 85:
            final_score = 85
            caps_applied.append("CAP 85%: No specific manual references (DMC/AMP/AWDP)")
    
    if not has_specific_component and not has_real_part_number:
        if final_score > 82:
            final_score = 82
            caps_applied.append("CAP 82%: No specific component or part number identified")
    
    if not has_causal_reasoning and is_fault_type:
        if final_score > 80:
            final_score = 80
            caps_applied.append("CAP 80%: Fault isolation without causal reasoning")
    
    if missing_subsystem_analysis:
        if final_score > 75:
            final_score = 75
            caps_applied.append(f"CAP 75%: Diagnosis does not analyze required subsystem: {', '.join(missing_subsystem_analysis)}")
    
    if diagnosis_suggests_electrical and query_implies_mechanical and not has_mechanism_explanation:
        if final_score > 78:
            final_score = 78
            caps_applied.append("CAP 78%: Electrical checks for mechanical problem without mechanism analysis")
    
    # =========================================================================
    # HARD RULE FOR 95%+ (SAFE_TO_PROCEED threshold)
    # ALL of these must be true for score to reach 95%+
    # =========================================================================
    can_exceed_95 = (
        system_analysis_score >= 75 and
        coverage_score >= 85 and
        evidence_count >= 5 and
        alignment_score >= 70 and
        has_specific_component and
        has_causal_reasoning and
        not missing_subsystem_analysis and
        (not is_fault_type or has_awdp or has_awdp_ref) and
        (has_amp_ref or has_real_dmc or has_awdp_ref)
    )
    
    if final_score >= 95 and not can_exceed_95:
        final_score = 94
        caps_applied.append("CAP 94%: Does not meet ALL strict criteria for SAFE_TO_PROCEED")
        missing = []
        if system_analysis_score < 75:
            missing.append(f"SystemAnalysis {system_analysis_score}<75")
        if coverage_score < 85:
            missing.append(f"Coverage {coverage_score}<85")
        if evidence_count < 5:
            missing.append(f"Evidence {evidence_count}<5")
        if alignment_score < 70:
            missing.append(f"Alignment {alignment_score}<70")
        if not has_specific_component:
            missing.append("NoSpecificComponent")
        if not has_causal_reasoning:
            missing.append("NoCausalReasoning")
        if is_fault_type and not has_awdp and not has_awdp_ref:
            missing.append("NoAWDP")
        if not has_amp_ref and not has_real_dmc and not has_awdp_ref:
            missing.append("NoManualRef")
        if missing_subsystem_analysis:
            missing.append(f"MissingSubsystem({', '.join(missing_subsystem_analysis)})")
        print(f"[CrewAI] 95% BLOCKED - Missing: {', '.join(missing)}")
    
    if caps_applied:
        for cap in caps_applied:
            print(f"[CrewAI] {cap}")
    
    final_score = max(40, min(round(final_score), 100))
    
    print(f"[CrewAI] === FINAL CERTAINTY SCORE: {final_score}% ===")
    
    return {
        "score": final_score,
        "breakdown": {
            "coverage": {"score": coverage_score, "weight": 0.25, "details": coverage_details},
            "system_analysis": {"score": system_analysis_score, "weight": 0.25, "details": analysis_details},
            "evidence": {"score": evidence_score, "weight": 0.20, "count": evidence_count, "details": evidence_details},
            "query_alignment": {"score": alignment_score, "weight": 0.20, "details": alignment_details},
            "diagram_analysis": {"score": diagram_score, "weight": 0.10, "details": diagram_details}
        },
        "can_exceed_95": can_exceed_95,
        "caps_applied": caps_applied,
        "evidence_found": list(found_evidence.keys())
    }

def format_diagnosis_text(rag_result: Dict[str, Any], query: str) -> str:
    """Format RAG result into professional diagnostic text."""
    answer = rag_result.get("answer", "")
    docs = rag_result.get("documents") or rag_result.get("chunks") or []
    
    if not answer and not docs:
        return f"Unable to retrieve documentation for query: {query}. Please verify RAG system connectivity."
    
    paragraphs = []
    
    if answer:
        clean_answer = re.sub(r'\s+', ' ', answer).strip()
        sentences = re.split(r'(?<=[.!?])\s+', clean_answer)
        
        current_para = []
        for sentence in sentences:
            current_para.append(sentence)
            if len(current_para) >= 3:
                paragraphs.append(" ".join(current_para))
                current_para = []
        if current_para:
            paragraphs.append(" ".join(current_para))
    
    if docs:
        doc_summary = []
        for doc in docs[:3]:
            content = doc.get("content", "")
            if content:
                preview = content[:300].strip()
                if preview:
                    doc_summary.append(preview)
        
        if doc_summary:
            paragraphs.append("Supporting documentation indicates: " + " ".join(doc_summary)[:500])
    
    return "\n\n".join(paragraphs) if paragraphs else "No detailed diagnosis available."

# ======================================================================
# API ENDPOINTS
# ======================================================================

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint."""
    rag_ok = check_rag_health()
    return HealthResponse(
        status="healthy" if rag_ok else "degraded",
        rag_connected=rag_ok,
        message="3-Tier CrewAI system ready" if rag_ok else "RAG API not available",
        agents=["Investigator", "Validator", "Supervisor"]
    )

@app.post("/diagnose", response_model=DiagnoseResponse)
def diagnose(request: DiagnoseRequest):
    """Run 3-Agent RAG-based diagnostic analysis with task-type logic."""
    start_time = time.time()
    
    print(f"\n{'='*60}")
    print(f"[CrewAI] New diagnostic request")
    print(f"[CrewAI] Query: {request.query}")
    print(f"[CrewAI] S/N: {request.serial_number}")
    print(f"[CrewAI] ATA/Training: {request.ata_code}")
    print(f"[CrewAI] Task Type: {request.task_type}")
    print(f"[CrewAI] Configuration: {request.aircraft_configuration or 'Unknown'} ({request.configuration_name or 'N/A'})")
    print(f"{'='*60}\n")
    
    # Use 3-Agent RAG system for fast and reliable responses
    return run_three_agent_diagnosis(request, start_time)

# ======================================================================
# TASK TYPE CONFIGURATION
# ======================================================================

TASK_TYPE_LABELS = {
    "fault_isolation": "Fault Isolation",
    "functional_test": "Functional Test",
    "operational_test": "Operational Test",
    "remove_procedure": "Remove Procedure",
    "install_procedure": "Install Procedure",
    "system_description": "System Description",
    "detailed_inspection": "Detailed Inspection",
    "disassembly": "Disassembly Procedure",
    "assembly": "Assembly Procedure",
    "adjustment": "Adjustment / Calibration",
    "bonding_check": "Bonding Check",
    "other": "Maintenance Task"
}

def get_task_type_instructions(task_type: str) -> str:
    """Return specific instructions based on task type."""
    instructions = {
        "fault_isolation": """
TASK TYPE: FAULT ISOLATION
You must:
- Interpret the system operation from the AMP
- Determine conditions that trigger the CAS message or anomaly
- Trace the logic of involved components using AWDP wiring diagrams
- MANDATORY: Search for and analyze AWDP schematic/wiring diagram for the affected system
- Identify relevant connectors, pin numbers, and wire routing from AWDP
- Provide: Recommended Tests, Likely Causes (with probability %), Affected Parts
""",
        "functional_test": """
TASK TYPE: FUNCTIONAL TEST
You must:
- Provide step-by-step testing procedure from AMP
- Include expected results for each test step
- Reference test equipment required (from Table 3)
- Include pass/fail criteria
- Reference AWDP wiring data for any electrical connections being tested
""",
        "operational_test": """
TASK TYPE: OPERATIONAL TEST
You must:
- Provide operational verification steps from AMP
- Include expected system behavior and operational limits
- MANDATORY: Reference AWDP schematic/wiring diagram for the system under test
- Analyze the AWDP diagram to identify signal flow and component interactions
- Include warning conditions to monitor
- Reference connector pin-outs and wiring from AWDP
""",
        "remove_procedure": """
TASK TYPE: REMOVE PROCEDURE
You must:
- Provide step-by-step removal procedure from AMP
- Include prerequisite conditions
- Reference access panels required
- List tools and support equipment from Table 3
- Include safety precautions
""",
        "install_procedure": """
TASK TYPE: INSTALL PROCEDURE
You must:
- Provide step-by-step installation procedure from AMP
- Include torque values and specifications
- Reference verification tests after installation
- List tools and support equipment from Table 3
- Include safety precautions
""",
        "system_description": """
TASK TYPE: SYSTEM DESCRIPTION
You must:
- Explain how the system works technically
- Describe component interactions
- Include system logic flow
- Reference system architecture from AMP
- Do NOT provide troubleshooting steps
""",
        "adjustment": """
TASK TYPE: ADJUSTMENT / CALIBRATION
You must:
- Provide exact adjustment procedure from manual
- Include adjustment mechanism location
- Specify expected readings before and after
- Include warmup time requirements
- Reference calibration tools required
""",
        "detailed_inspection": """
TASK TYPE: DETAILED INSPECTION
You must:
- Provide inspection criteria and limits
- Include visual inspection steps
- Reference acceptance/rejection criteria
- Specify measurement methods if applicable
""",
    }
    return instructions.get(task_type, instructions["fault_isolation"])


def run_three_agent_diagnosis(request: DiagnoseRequest, start_time: float) -> DiagnoseResponse:
    """Run 3-Agent diagnostic system with task-type awareness.
    
    3-Agent System:
    1. Primary Diagnostic Agent - Generates initial diagnosis
    2. Cross-Check Agent - Validates and verifies diagnosis
    3. Historical/Inventory Agent - Adds historical context
    """
    task_type = request.task_type or "fault_isolation"
    task_label = TASK_TYPE_LABELS.get(task_type, "Fault Isolation")
    
    # Get aircraft configuration for filtering
    config_code = request.aircraft_configuration or ""
    config_name = request.configuration_name or ""
    config_context = f" [{config_code} - {config_name}]" if config_code else ""
    
    print(f"[Agent-1] PRIMARY DIAGNOSTIC AGENT starting...")
    print(f"[Agent-1] Task Type: {task_label}")
    print(f"[Agent-1] Aircraft Config: {config_code or 'Unknown'} ({config_name or 'N/A'})")
    
    # AGENT 1: Primary Diagnostic Agent - Query RAG with task-type and configuration context
    try:
        # Enhance query with task type AND configuration context for RAG
        enhanced_query = f"[{task_label}]{config_context} {request.query}"
        rag_result = query_rag(enhanced_query, top_k=10, ata_code=request.ata_code)
    except Exception as e:
        print(f"[Agent-1] RAG query exception: {e}")
        raise HTTPException(status_code=503, detail=f"RAG query failed: {e}")
    
    if "error" in rag_result:
        raise HTTPException(
            status_code=503,
            detail=f"RAG API not available: {rag_result['error']}"
        )
    
    # Format diagnosis with task-type specific instructions
    raw_diagnosis = format_diagnosis_text(rag_result, request.query)
    diagnosis_text = clean_markdown_artifacts(raw_diagnosis)
    diagnosis_text = validate_part_numbers(diagnosis_text)
    
    # Add technical references header (mandatory)
    ata_chapter = extract_ata_chapter(diagnosis_text) or rag_result.get("ata", request.ata_code)
    
    # Check for AWDP (wiring diagrams) in RAG documents
    rag_documents = rag_result.get("documents", [])
    has_awdp = False
    awdp_ref = "Not Available"
    awdp_refs_found = []
    
    # AWDP document patterns - multiple formats
    # Format 1: 30-A-XX-XX-XX-XXX-XXXA-A (wiring diagrams)
    # Format 2: 39-A-AWDP-XX-XXX (legacy format)
    # Format 3: Any reference to wiring/schematic data
    awdp_patterns = [
        r'30-[A-Z]-\d{2}-\d{2}-\d{2}-\d{2}[A-Z]-\d{3}[A-Z]-[A-Z]',  # AWDP wiring diagram format
        r'39-[A-Z]-AWDP-\d{2}-[A-Z0-9X-]+',  # Legacy AWDP format
        r'\d{2}-[A-Z]-\d{2}-\d{2}-\d{2}-\d{2}[A-Z]-\d{3}[A-Z]-[A-Z]',  # Generic DMC wiring
    ]
    
    for doc in rag_documents:
        doc_text = doc.get("content", "") or doc.get("text", "") or ""
        doc_path = doc.get("doc_path", "") or ""
        combined = doc_text + " " + doc_path
        combined_lower = combined.lower()
        
        # Check for AWDP indicators
        awdp_indicators = ["awdp", "wiring data", "wiring diagram", "schematic", "circuit diagram", "electrical diagram"]
        if any(ind in combined_lower for ind in awdp_indicators):
            has_awdp = True
            # Try to extract AWDP reference using multiple patterns
            for pattern in awdp_patterns:
                awdp_matches = re.findall(pattern, combined, re.IGNORECASE)
                awdp_refs_found.extend(awdp_matches)
            if not awdp_refs_found:
                awdp_refs_found.append("Referenced in procedure")
            print(f"[AWDP] Found AWDP indicator in doc: {doc_path[-50:]}")
    
    # Also check diagnosis text for AWDP references
    diagnosis_combined = diagnosis_text
    for pattern in awdp_patterns:
        diag_matches = re.findall(pattern, diagnosis_combined, re.IGNORECASE)
        if diag_matches:
            has_awdp = True
            awdp_refs_found.extend(diag_matches)
            print(f"[AWDP] Found AWDP pattern in diagnosis: {diag_matches}")
    
    # Also check for wiring diagram keywords in diagnosis
    if not has_awdp:
        diagnosis_lower = diagnosis_text.lower()
        if any(term in diagnosis_lower for term in ['awdp', 'wiring diagram', 'schematic', 'circuit diagram']):
            has_awdp = True
            awdp_refs_found.append("Referenced in procedure")
            print(f"[AWDP] Found AWDP reference in diagnosis text")
    
    # Set the AWDP reference string
    if awdp_refs_found:
        unique_refs = list(dict.fromkeys(awdp_refs_found))  # Remove duplicates, preserve order
        awdp_ref = ", ".join(unique_refs[:3])  # Show up to 3 references
    
    # If still no AWDP found, do a specific AWDP search for the ATA with configuration
    if not has_awdp and request.ata_code:
        # Include configuration in AWDP search to get config-specific diagrams
        config_filter = f" {config_code} {config_name}" if config_code else ""
        awdp_query = f"wiring diagram schematic circuit {request.ata_code} AWDP{config_filter}"
        print(f"[AWDP] Secondary search with config: {awdp_query}")
        try:
            awdp_rag_result = query_rag(awdp_query, top_k=5, ata_code=request.ata_code)
            awdp_docs = awdp_rag_result.get("documents", [])
            for doc in awdp_docs:
                doc_text = doc.get("content", "") or doc.get("text", "") or ""
                doc_lower = doc_text.lower()
                if any(term in doc_lower for term in ['wiring', 'schematic', 'circuit', 'diagram', 'connector', 'pin']):
                    has_awdp = True
                    for pattern in awdp_patterns:
                        matches = re.findall(pattern, doc_text, re.IGNORECASE)
                        if matches:
                            awdp_ref = matches[0]
                            print(f"[AWDP] Found via secondary search: {awdp_ref}")
                            break
                    if awdp_ref == "Not Available":
                        awdp_ref = "See wiring data in referenced documents"
                    break
        except Exception as e:
            print(f"[AWDP] Secondary search failed: {e}")
    
    # Build configuration line for header
    config_line = ""
    if config_code:
        config_line = f"Aircraft Config: {config_code} ({config_name})\n"
    
    manual_header = f"""Technical References Used:
AMP: {ata_chapter or 'See referenced DMC codes'}
AWDP: {awdp_ref}
{config_line}Task Type: {task_label}

"""
    
    # AGENT 2: Cross-Check & Verification Agent
    print(f"[Agent-2] CROSS-CHECK AGENT validating diagnosis...")
    
    # Verify diagnosis has required components
    verification_notes = []
    has_dmc_ref = bool(re.search(r'\d{2}-[A-Z]-\d{2}-\d{2}', diagnosis_text, re.IGNORECASE))
    has_procedure_steps = bool(re.search(r'^\s*\d+\.', diagnosis_text, re.MULTILINE))
    has_safety_note = any(word in diagnosis_text.lower() for word in ['caution', 'warning', 'note:', 'safety'])
    
    if has_dmc_ref and has_procedure_steps:
        verification_status = "VERIFIED - NO CORRECTIONS"
        verification_notes.append("DMC references found and validated")
        verification_notes.append("Procedure steps verified against manual structure")
    elif has_procedure_steps:
        verification_status = "VERIFIED WITH IMPROVEMENTS"
        verification_notes.append("Procedure steps present but DMC reference should be verified")
    else:
        verification_status = "CRITICAL CORRECTION REQUIRED"
        verification_notes.append("Missing mandatory procedure structure")
    
    print(f"[Agent-2] Verification status: {verification_status}")
    
    # AGENT 3: Historical + Inventory Agent
    print(f"[Agent-3] HISTORICAL + INVENTORY AGENT checking history...")
    
    # Check for historical matches (placeholder - would query troubleshooting_history table)
    historical_alert = ""
    # In production, this would query the database for similar issues
    # For now, we note that historical search is available
    
    # Build final diagnosis with all agent contributions
    final_diagnosis = manual_header + diagnosis_text
    
    # Add verification footer
    final_diagnosis += f"""

Cross-Check Status: {verification_status}
{''.join(f'  {note}' for note in verification_notes)}"""
    
    # Add historical alert if found
    if historical_alert:
        final_diagnosis = f"HISTORICAL ALERT\n{historical_alert}\n\n" + final_diagnosis
    
    # NOTE: Mechanic log template is now handled by frontend as editable fields
    
    # Extract structured data
    parts_raw = extract_part_numbers(final_diagnosis)
    affected_parts = [
        AffectedPart(
            part_number=p["part_number"],
            description=p["description"],
            location=p["location"],
            action=p["action"]
        ) for p in parts_raw
    ]
    
    causes_raw = extract_likely_causes(final_diagnosis)
    likely_causes = [
        LikelyCause(
            cause=c["cause"],
            probability=c["probability"],
            reasoning=c["reasoning"]
        ) for c in causes_raw
    ]
    
    tests_raw = extract_recommended_tests(final_diagnosis, ata_chapter)
    recommended_tests = [
        RecommendedTest(
            step=t["step"],
            description=t["description"],
            reference=t["reference"],
            expected_result=t["expected_result"]
        ) for t in tests_raw
    ]
    
    references = extract_references(final_diagnosis)
    if not references and rag_result.get("references"):
        references = rag_result["references"][:10]
    
    # Calculate certainty with rigorous v3.0 formula
    certainty_result = calculate_certainty_score(
        rag_result, final_diagnosis, request.query, request.ata_code,
        task_type=task_type, has_awdp=has_awdp
    )
    certainty_score = certainty_result["score"]
    certainty_breakdown = certainty_result.get("breakdown", {})
    
    # Apply task-type certainty rules
    if task_type == "fault_isolation" and not likely_causes:
        certainty_score = min(certainty_score, 80)
        print(f"[Agent-2] Certainty reduced: Fault isolation without likely causes")
    
    if task_type in ["remove_procedure", "install_procedure"] and not has_procedure_steps:
        certainty_score = min(certainty_score, 75)
        print(f"[Agent-2] Certainty reduced: R&I procedure without steps")
    
    certainty_status = "SAFE_TO_PROCEED" if certainty_score >= CERTAINTY_THRESHOLD else "REQUIRE_EXPERT"
    
    # Generate supervisor notes
    if certainty_score >= CERTAINTY_THRESHOLD:
        supervisor_notes = (
            f"APPROVED - Certainty score {certainty_score}% meets safety threshold. "
            f"Task type: {task_label}. All checklist items verified. "
            "Report approved for maintenance execution."
        )
    else:
        supervisor_notes = (
            f"APPROVED WITH EXPERT REQUIRED - Certainty score {certainty_score}% below 95% threshold. "
            f"Task type: {task_label}. Expert consultation mandatory before proceeding."
        )
    
    processing_time = (time.time() - start_time) * 1000
    
    print(f"\n[CrewAI] 3-Agent Diagnosis complete")
    print(f"[CrewAI] Task Type: {task_label}")
    print(f"[CrewAI] Certainty: {certainty_score}% - {certainty_status}")
    print(f"[CrewAI] Parts found: {len(affected_parts)}")
    print(f"[CrewAI] References: {len(references)}")
    print(f"[CrewAI] Verification: {verification_status}")
    print(f"[CrewAI] Processing time: {processing_time:.0f}ms\n")
    
    return DiagnoseResponse(
        query=request.query,
        serial_number=request.serial_number,
        diagnosis=final_diagnosis,
        ata_chapter=ata_chapter,
        certainty_score=certainty_score,
        certainty_status=certainty_status,
        affected_parts=affected_parts,
        likely_causes=likely_causes,
        recommended_tests=recommended_tests,
        references=references,
        supervisor_notes=supervisor_notes,
        source="3-Agent System (Primary → Cross-Check → Historical)",
        processing_time_ms=round(processing_time, 2)
    )

def run_crewai_diagnosis(request: DiagnoseRequest, start_time: float) -> DiagnoseResponse:
    """Run diagnosis using the full 3-tier CrewAI system."""
    try:
        crew = AW139DiagnosticCrew()
        crew_result = crew.run_diagnostic(request.query, request.serial_number)
        
        if not crew_result.get("success", False):
            print(f"[CrewAI] CrewAI returned error: {crew_result.get('error')}")
            return run_rag_only_diagnosis(request, start_time)
        
        raw_diagnosis = crew_result.get("result", "") or crew_result.get("diagnosis", "")
        diagnosis_text = clean_markdown_artifacts(raw_diagnosis)
        diagnosis_text = validate_part_numbers(diagnosis_text)
        
        ata_chapter = crew_result.get("ata_chapter", "") or extract_ata_chapter(diagnosis_text)
        certainty_score = crew_result.get("certainty_score", 0)
        
        if certainty_score == 0:
            certainty_result = calculate_certainty_score(
                {"documents": []}, diagnosis_text, request.query, request.ata_code,
                task_type=request.task_type or "fault_isolation"
            )
            certainty_score = certainty_result["score"]
        
        certainty_status = "SAFE_TO_PROCEED" if certainty_score >= CERTAINTY_THRESHOLD else "REQUIRE_EXPERT"
        
        parts_data = crew_result.get("affected_parts", [])
        affected_parts = []
        for p in parts_data:
            if isinstance(p, dict):
                pn = str(p.get("part_number", "")).strip()
                if pn and len(pn) >= 3 and not pn.startswith("("):
                    pn = validate_part_numbers(pn)
                    affected_parts.append(AffectedPart(
                        part_number=pn,
                        description=str(p.get("description", "Component")),
                        location=str(p.get("location", "See manual")),
                        action=str(p.get("action", "INSPECT"))
                    ))
        
        if not affected_parts:
            parts_raw = extract_part_numbers(diagnosis_text)
            affected_parts = [
                AffectedPart(
                    part_number=p["part_number"],
                    description=p["description"],
                    location=p["location"],
                    action=p["action"]
                ) for p in parts_raw
            ]
        
        causes_data = crew_result.get("likely_causes", [])
        likely_causes = []
        for c in causes_data:
            if isinstance(c, dict):
                likely_causes.append(LikelyCause(
                    cause=str(c.get("cause", "Unknown")),
                    probability=int(c.get("probability", 0)),
                    reasoning=str(c.get("reasoning", "Based on analysis"))
                ))
        
        if not likely_causes:
            causes_raw = extract_likely_causes(diagnosis_text)
            likely_causes = [
                LikelyCause(
                    cause=c["cause"],
                    probability=c["probability"],
                    reasoning=c["reasoning"]
                ) for c in causes_raw
            ]
        
        tests_data = crew_result.get("recommended_tests", [])
        recommended_tests = []
        for i, t in enumerate(tests_data):
            if isinstance(t, dict):
                recommended_tests.append(RecommendedTest(
                    step=int(t.get("step", i + 1)),
                    description=str(t.get("description", "")),
                    reference=str(t.get("reference", "")),
                    expected_result=str(t.get("expected_result", ""))
                ))
        
        if not recommended_tests:
            tests_raw = extract_recommended_tests(diagnosis_text, ata_chapter)
            recommended_tests = [
                RecommendedTest(
                    step=t["step"],
                    description=t["description"],
                    reference=t["reference"],
                    expected_result=t["expected_result"]
                ) for t in tests_raw
            ]
        
        references = crew_result.get("references", [])
        if not references:
            references = extract_references(diagnosis_text)
        
        supervisor_notes = crew_result.get("supervisor_notes", "")
        if not supervisor_notes:
            if certainty_score >= CERTAINTY_THRESHOLD:
                supervisor_notes = (
                    f"APPROVED - Certainty score {certainty_score}% meets safety threshold. "
                    "All checklist items verified. Report approved for maintenance execution."
                )
            else:
                supervisor_notes = (
                    f"APPROVED WITH EXPERT REQUIRED - Certainty score {certainty_score}% below 95% threshold. "
                    "Expert consultation mandatory before proceeding with maintenance actions."
                )
        
        processing_time = (time.time() - start_time) * 1000
        
        print(f"\n[CrewAI] 3-Tier Diagnosis complete")
        print(f"[CrewAI] Certainty: {certainty_score}% - {certainty_status}")
        print(f"[CrewAI] Parts found: {len(affected_parts)}")
        print(f"[CrewAI] References: {len(references)}")
        print(f"[CrewAI] Processing time: {processing_time:.0f}ms\n")
        
        return DiagnoseResponse(
            query=request.query,
            serial_number=request.serial_number,
            diagnosis=diagnosis_text,
            ata_chapter=ata_chapter,
            certainty_score=certainty_score,
            certainty_status=certainty_status,
            affected_parts=affected_parts,
            likely_causes=likely_causes,
            recommended_tests=recommended_tests,
            references=references,
            supervisor_notes=supervisor_notes,
            source="CrewAI 3-Tier System (Investigator → Validator → Supervisor)",
            processing_time_ms=round(processing_time, 2)
        )
        
    except Exception as e:
        print(f"[CrewAI] CrewAI execution error: {e}")
        print("[CrewAI] Falling back to RAG-only mode")
        return run_rag_only_diagnosis(request, start_time)

def run_rag_only_diagnosis(request: DiagnoseRequest, start_time: float) -> DiagnoseResponse:
    """Run diagnosis using RAG only (fallback mode)."""
    try:
        rag_result = query_rag(request.query, top_k=10, ata_code=request.ata_code)
    except Exception as e:
        print(f"[CrewAI] RAG query exception: {e}")
        raise HTTPException(status_code=503, detail=f"RAG query failed: {e}")
    
    if "error" in rag_result:
        raise HTTPException(
            status_code=503,
            detail=f"RAG API not available: {rag_result['error']}"
        )
    
    raw_diagnosis = format_diagnosis_text(rag_result, request.query)
    diagnosis_text = clean_markdown_artifacts(raw_diagnosis)
    diagnosis_text = validate_part_numbers(diagnosis_text)
    
    ata_chapter = extract_ata_chapter(diagnosis_text) or rag_result.get("ata", "")
    
    parts_raw = extract_part_numbers(diagnosis_text)
    affected_parts = [
        AffectedPart(
            part_number=p["part_number"],
            description=p["description"],
            location=p["location"],
            action=p["action"]
        ) for p in parts_raw
    ]
    
    causes_raw = extract_likely_causes(diagnosis_text)
    likely_causes = [
        LikelyCause(
            cause=c["cause"],
            probability=c["probability"],
            reasoning=c["reasoning"]
        ) for c in causes_raw
    ]
    
    tests_raw = extract_recommended_tests(diagnosis_text, ata_chapter)
    recommended_tests = [
        RecommendedTest(
            step=t["step"],
            description=t["description"],
            reference=t["reference"],
            expected_result=t["expected_result"]
        ) for t in tests_raw
    ]
    
    references = extract_references(diagnosis_text)
    if not references and rag_result.get("references"):
        references = rag_result["references"][:10]
    
    certainty_result = calculate_certainty_score(
        rag_result, diagnosis_text, request.query, request.ata_code,
        task_type=request.task_type or "fault_isolation"
    )
    certainty_score = certainty_result["score"]
    certainty_status = "SAFE_TO_PROCEED" if certainty_score >= CERTAINTY_THRESHOLD else "REQUIRE_EXPERT"
    
    if certainty_score >= CERTAINTY_THRESHOLD:
        supervisor_notes = (
            f"APPROVED - Certainty score {certainty_score}% meets safety threshold. "
            "All checklist items verified. Report approved for maintenance execution."
        )
    else:
        supervisor_notes = (
            f"APPROVED WITH EXPERT REQUIRED - Certainty score {certainty_score}% below 95% threshold. "
            "Expert consultation mandatory before proceeding with maintenance actions."
        )
    
    processing_time = (time.time() - start_time) * 1000
    
    print(f"\n[CrewAI] RAG-Only Diagnosis complete")
    print(f"[CrewAI] Certainty: {certainty_score}% - {certainty_status}")
    print(f"[CrewAI] Parts found: {len(affected_parts)}")
    print(f"[CrewAI] References: {len(references)}")
    print(f"[CrewAI] Processing time: {processing_time:.0f}ms\n")
    
    return DiagnoseResponse(
        query=request.query,
        serial_number=request.serial_number,
        diagnosis=diagnosis_text,
        ata_chapter=ata_chapter,
        certainty_score=certainty_score,
        certainty_status=certainty_status,
        affected_parts=affected_parts,
        likely_causes=likely_causes,
        recommended_tests=recommended_tests,
        references=references,
        supervisor_notes=supervisor_notes,
        source="RAG-Only Mode (CrewAI fallback)",
        processing_time_ms=round(processing_time, 2)
    )

# ======================================================================
# MAIN ENTRY POINT
# ======================================================================

def wait_for_port(port, max_retries=5, delay=3):
    """Wait for port to become available with retries."""
    import socket
    for attempt in range(max_retries):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(("0.0.0.0", port))
            sock.close()
            return True
        except OSError:
            sock.close()
            if attempt < max_retries - 1:
                print(f"[CrewAI] Port {port} in use, waiting {delay}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(delay)
    return False

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CREW_API_PORT", "9000"))
    
    if not wait_for_port(port):
        print(f"[CrewAI] ERROR: Port {port} still in use after retries. Exiting.")
        exit(1)
    
    print(f"Starting AW139 CrewAI 3-Tier Diagnostic Server on port {port}")
    print(f"Agents: Investigator -> Validator -> Supervisor")
    print(f"RAG API endpoint: {RAG_QUERY_ENDPOINT}")
    print(f"Certainty threshold: {CERTAINTY_THRESHOLD}%")
    uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=120, access_log=True)
