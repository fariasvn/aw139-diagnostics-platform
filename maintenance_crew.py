#!/usr/bin/env python3
"""
AW139 Maintenance Diagnostic System - Hierarchical 3-Agent System
==================================================================
CrewAI-based diagnostic system with 3-tier compliance enforcement:
  1. Investigator - Senior troubleshooting specialist (25+ years)
  2. Validator - Documentation specialist and professional editor
  3. Supervisor - Quality assurance and final approval (25+ years)

All diagnoses require 95% certainty threshold for safety-critical operations.
"""

import json
import logging
import sys
import time
from typing import Any, Dict, Optional, List

import requests
from crewai import Agent, Crew, Process, Task
from crewai.tools import BaseTool

# =============================================================================
# CONFIGURATION
# =============================================================================

RAG_API_BASE_URL: str = "http://localhost:8000"
RAG_QUERY_ENDPOINT: str = f"{RAG_API_BASE_URL}/query"
RAG_HEALTH_ENDPOINT: str = f"{RAG_API_BASE_URL}/health"

REQUEST_TIMEOUT: int = 90
HEALTH_CHECK_TIMEOUT: int = 10
MAX_RETRIES: int = 3
RETRY_BACKOFF_BASE: float = 2.0
CERTAINTY_THRESHOLD: int = 95

# =============================================================================
# LOGGING SETUP
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("AW139_DIAGNOSTIC")


def log_separator(char: str = "=", length: int = 80) -> None:
    print(char * length)


def log_header(title: str) -> None:
    log_separator()
    print(f"  {title}")
    log_separator()


# =============================================================================
# RAG API CLIENT
# =============================================================================

class RAGClient:
    """Client for communicating with the RAG API backend."""

    def __init__(
        self,
        base_url: str = RAG_API_BASE_URL,
        timeout: int = REQUEST_TIMEOUT,
        max_retries: int = MAX_RETRIES
    ) -> None:
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.query_endpoint = f"{base_url}/query"
        self.health_endpoint = f"{base_url}/health"

    def check_health(self) -> Dict[str, Any]:
        logger.info("Checking RAG API health...")
        try:
            response = requests.get(self.health_endpoint, timeout=HEALTH_CHECK_TIMEOUT)
            response.raise_for_status()
            data = response.json()
            logger.info(f"RAG API Status: {data.get('status')} | Docs: {data.get('document_count', 0):,}")
            return data
        except Exception as e:
            logger.error(f"RAG API health check failed: {e}")
            raise ConnectionError(f"RAG API not available: {e}")

    def query(self, query_text: str, top_k: int = 10) -> Dict[str, Any]:
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"RAG Query (attempt {attempt}/{self.max_retries}): {query_text[:60]}...")
                response = requests.post(
                    self.query_endpoint,
                    json={"query": query_text, "top_k": top_k},
                    timeout=self.timeout
                )
                response.raise_for_status()
                data = response.json()
                logger.info(f"RAG Query successful. Documents: {len(data.get('documents', []))}")
                return data

            except Exception as e:
                last_error = e
                logger.warning(f"Query error on attempt {attempt}: {e}")
                if attempt < self.max_retries:
                    time.sleep(RETRY_BACKOFF_BASE ** attempt)

        raise RuntimeError(f"RAG query failed after {self.max_retries} attempts: {last_error}")


# =============================================================================
# CREWAI RAG TOOL
# =============================================================================

class RAGQueryTool(BaseTool):
    """CrewAI tool for querying AW139 RAG documentation system."""

    name: str = "RAGQueryTool"
    description: str = (
        "Query the AW139 RAG documentation system containing 22,000+ documents. "
        "Use this tool to search for: ATA chapters, AWP procedures, AMM sections, "
        "IPD part numbers, test limits, torque values, and troubleshooting procedures. "
        "Input: A specific maintenance query. Output: Technical data from official AW139 manuals."
    )

    def _run(self, *args: Any, **kwargs: Any) -> Any:
        query = self._extract_query(args, kwargs)
        if not query:
            return json.dumps({"status": "ERROR", "message": "No query provided"})

        logger.info(f"RAGQueryTool executing: {query[:80]}...")

        try:
            client = RAGClient()
            data = client.query(query, top_k=10)
            return self._format_response(query, data)
        except Exception as e:
            logger.error(f"RAGQueryTool error: {e}")
            return json.dumps({"status": "ERROR", "message": str(e), "query": query})

    @staticmethod
    def _extract_query(args: tuple, kwargs: dict) -> str:
        if args:
            return str(args[0])
        return str(kwargs.get("query", kwargs.get("tool_input", "")))

    @staticmethod
    def _format_response(query: str, data: Dict[str, Any]) -> str:
        documents = data.get("documents", [])
        answer = data.get("answer", "")
        ata = data.get("ata", "")
        references = data.get("references", [])

        doc_contents = []
        for doc in documents:
            content = doc.get("content", "")
            if content:
                doc_contents.append(content)

        return json.dumps({
            "status": "SUCCESS",
            "query": query,
            "ata": ata,
            "references": references,
            "document_count": len(documents),
            "gpt_analysis": answer,
            "raw_documents": "\n\n---\n\n".join(doc_contents[:5])
        }, indent=2, ensure_ascii=False)


# =============================================================================
# 3-TIER AGENT SYSTEM
# =============================================================================

def create_investigator_agent() -> Agent:
    """
    AGENT 1: Senior AW139 Troubleshooting Specialist
    - 25+ years experience in AW139 maintenance
    - Queries all manuals for diagnosis data
    - Consults IPD for part numbers based on serial number compatibility
    - Identifies all parts involved in the system
    """
    return Agent(
        role="Senior AW139 Troubleshooting Specialist",
        goal=(
            "Use the RAGQueryTool to retrieve ALL relevant technical data from AW139 manuals. "
            "Your investigation must include:\n"
            "1. ATA chapter identification and system description\n"
            "2. All part numbers (P/N) from IPD compatible with the aircraft serial number\n"
            "3. Component locations and functions\n"
            "4. Known failure modes and symptoms from troubleshooting manuals\n"
            "5. Related systems that may be affected\n"
            "6. Historical issues with similar symptoms\n"
            "Query the RAG system multiple times if needed to gather complete data."
        ),
        backstory=(
            "You are a Level-D certified AW139 maintenance specialist with over 25 years "
            "of hands-on experience. You have worked on hundreds of AW139 helicopters "
            "and have deep knowledge of avionics, hydraulics, powerplant, and electrical systems. "
            "You are meticulous in your research - you query the documentation system multiple "
            "times to ensure you have ALL relevant information. You NEVER guess or fabricate "
            "technical data. If information is not found, you clearly state 'DATA NOT FOUND IN MANUALS'. "
            "Your investigations are thorough and leave no stone unturned."
        ),
        tools=[RAGQueryTool()],
        verbose=True,
        allow_delegation=False,
        max_iter=5,
    )


def create_validator_agent() -> Agent:
    """
    AGENT 2: Documentation Validator and Professional Editor
    - Senior troubleshooting specialist with editorial expertise
    - Organizes data professionally with proper formatting
    - Applies logical reasoning to diagnostic data
    - Recommends tests citing AMP and AWD manuals
    - Verifies all part numbers and specifications
    - Checks for similar registered problems
    """
    return Agent(
        role="Senior Documentation Validator and Professional Technical Editor",
        goal=(
            "Transform the Investigator's findings into a PROFESSIONALLY FORMATTED diagnostic report.\n\n"
            "CRITICAL FORMATTING RULES - YOU MUST FOLLOW:\n"
            "1. NEVER use markdown symbols: No ##, No ***, No --, No **, No *, No #\n"
            "2. Write in PLAIN TEXT with proper paragraphs and sentence flow\n"
            "3. Section titles must be UPPERCASE followed by colon (e.g., DIAGNOSIS SUMMARY:)\n"
            "4. Use numbered lists (1. 2. 3.) only for sequential procedures\n"
            "5. Use letters (a) b) c)) for sub-items within procedures\n\n"
            "REFERENCE REQUIREMENTS - MANDATORY:\n"
            "1. AWP references MUST be complete: AWP 32-31-00-00-00A-520A-A (not just '32-31-01')\n"
            "2. AMP references MUST be complete: AMP 32-31-00-00-00A-720A-A (not just 'AMP section')\n"
            "3. IPD part numbers MUST be complete: 3G5720A00931 or 109-0707-03-01 (no truncation)\n"
            "4. NEVER write incomplete references like 'SK139-1225 (NT' - complete it or omit it\n"
            "5. If a reference is not found in RAG, write 'Reference not found in documentation'\n\n"
            "CONTENT REQUIREMENTS:\n"
            "1. ORGANIZE into clear paragraphs with proper sentence structure\n"
            "2. VERIFY all part numbers are complete (no parentheses left open, no truncation)\n"
            "3. LIST affected parts with: P/N, Description, Location, Action\n"
            "4. RECOMMEND tests with COMPLETE AMP/AWP document identifiers\n"
            "5. RANK causes by probability with technical reasoning\n"
            "6. CALCULATE certainty score (0-100%) based on evidence quality"
        ),
        backstory=(
            "You are a senior technical documentation specialist and professional editor with 20+ years "
            "in aviation maintenance documentation. You have ZERO TOLERANCE for unprofessional formatting.\n\n"
            "YOUR EDITORIAL STANDARDS:\n"
            "- You NEVER use markdown symbols (##, **, --, *) in your output\n"
            "- You write in clear, flowing prose with proper paragraphs\n"
            "- You use UPPERCASE section headers followed by colon\n"
            "- You ensure every sentence is grammatically correct\n"
            "- You verify every reference is COMPLETE (full document identifiers)\n"
            "- You reject any incomplete part numbers or truncated data\n\n"
            "You understand that poorly formatted reports cause confusion and delays in maintenance. "
            "Your reports are used by mechanics who need clear, professional documentation. "
            "Every part number must be complete, every reference must include the full document ID, "
            "and the text must flow logically from diagnosis to recommendations."
        ),
        tools=[RAGQueryTool()],
        verbose=True,
        allow_delegation=False,
        max_iter=5,
    )


def create_supervisor_agent() -> Agent:
    """
    AGENT 3: Quality Assurance Supervisor
    - 25+ years experience, detail-oriented
    - Reviews all work from Investigator and Validator
    - Returns errors to agents for correction
    - Only approves reports with certainty >= 95%
    - Ensures safety-critical compliance
    """
    return Agent(
        role="Senior Quality Assurance Supervisor",
        goal=(
            "Review the diagnostic report with extreme attention to detail.\n\n"
            "FORMATTING ENFORCEMENT (MANDATORY):\n"
            "1. REJECT if any markdown symbols found: ##, **, ***, --, *, #, ---\n"
            "2. REJECT if any part numbers are truncated or incomplete\n"
            "3. REJECT if document references are incomplete (must have full AWP/AMP IDs)\n"
            "4. VERIFY text is in proper paragraphs with correct punctuation\n\n"
            "CONTENT VERIFICATION:\n"
            "1. VERIFY the report contains all required sections\n"
            "2. CHECK that all part numbers are complete (no truncation)\n"
            "3. ENSURE all test procedures reference complete AMP/AWP documents\n"
            "4. VALIDATE the certainty score calculation is justified\n"
            "5. CONFIRM affected parts list is complete with proper descriptions\n"
            "6. APPROVE only if certainty >= 95% OR flag REQUIRE_EXPERT status\n"
            "7. ADD your supervisor notes in PLAIN TEXT (no markdown)\n\n"
            "YOUR OUTPUT MUST ALSO BE IN PLAIN TEXT WITH NO MARKDOWN SYMBOLS."
        ),
        backstory=(
            "You are the Chief Quality Assurance Inspector with 25+ years in aviation maintenance "
            "management. You have ZERO TOLERANCE for:\n"
            "- Markdown formatting symbols (##, **, --, *)\n"
            "- Incomplete part numbers (truncated or cut off)\n"
            "- Incomplete document references (missing full identifiers)\n"
            "- Unprofessional text formatting\n\n"
            "You have seen accidents caused by poor documentation and you will NEVER let a substandard "
            "report pass your review. If you find formatting violations, you REJECT immediately. "
            "You understand that certainty below 95% means mandatory expert consultation. "
            "Your approval signature carries significant weight because everyone knows you never "
            "approve anything that isn't absolutely correct AND properly formatted."
        ),
        tools=[],
        verbose=True,
        allow_delegation=True,
        max_iter=3,
    )


# =============================================================================
# TASK DEFINITIONS
# =============================================================================

def create_investigation_task(query: str, serial_number: str, investigator: Agent) -> Task:
    return Task(
        description=f"""
DIAGNOSTIC INVESTIGATION REQUEST
================================
Query: {query}
Aircraft Serial Number: {serial_number}

YOUR MISSION:
Use the RAGQueryTool to thoroughly investigate this issue. Make MULTIPLE queries to gather:

1. ATA SYSTEM IDENTIFICATION
   - Query for the specific ATA chapter and system involved
   - Identify all related subsystems

2. PART NUMBERS FROM IPD
   - Query for part numbers compatible with S/N {serial_number}
   - List ALL components in the affected system with P/N

3. TROUBLESHOOTING DATA
   - Query for known failure modes with these symptoms
   - Find step-by-step troubleshooting procedures

4. TEST SPECIFICATIONS
   - Query for test limits, tolerances, and expected values
   - Find required test equipment and tools

5. HISTORICAL ISSUES
   - Query for service bulletins or known issues with this system
   - Find similar cases in the documentation

CRITICAL: Make at least 3 different RAG queries to ensure comprehensive coverage.
DO NOT fabricate any data - only report what you find in the manuals.
""",
        expected_output=(
            "A comprehensive investigation report containing:\n"
            "- ATA chapter and system identification\n"
            "- Complete list of part numbers from IPD\n"
            "- Troubleshooting procedures from manuals\n"
            "- Test specifications with limits\n"
            "- Any relevant service bulletins or historical issues\n"
            "All data must be sourced from RAG queries."
        ),
        agent=investigator,
    )


def create_validation_task(query: str, validator: Agent) -> Task:
    return Task(
        description=f"""
PROFESSIONAL DOCUMENTATION AND FORMATTING TASK
===============================================
Original Query: {query}

You have received the Investigator's raw findings. Transform them into a PROFESSIONAL report.

MANDATORY FORMATTING RULES (ZERO TOLERANCE FOR VIOLATIONS):

1. NO MARKDOWN SYMBOLS ALLOWED
   FORBIDDEN: ##, ###, **, ***, --, *, #, ---
   Use UPPERCASE HEADERS followed by colon instead (e.g., DIAGNOSIS SUMMARY:)

2. PARAGRAPH STRUCTURE
   Write in complete sentences organized into logical paragraphs.
   Each paragraph should have a clear topic and flow naturally to the next.
   Use proper punctuation and grammar throughout.

3. SECTION HEADERS
   Use UPPERCASE TEXT followed by colon:
   DIAGNOSIS SUMMARY:
   AFFECTED PARTS:
   LIKELY CAUSES:
   RECOMMENDED TESTS:
   CERTAINTY ASSESSMENT:
   REFERENCES:

CONTENT REQUIREMENTS:

1. DIAGNOSIS SUMMARY:
   Write 2-3 paragraphs explaining the issue, system involved, and initial assessment.
   Use clear, professional prose. No bullet points here.

2. AFFECTED PARTS:
   List each part on its own line with format:
   P/N: [complete part number] - [description] - Location: [zone] - Action: [INSPECT/REPLACE/TEST]
   
   CRITICAL: Part numbers must be COMPLETE. Examples:
   CORRECT: 3G5720A00931, 109-0707-03-01, SK139-1225-1
   WRONG: SK139-1225 (NT, partial number, or truncated

3. LIKELY CAUSES:
   List as numbered items with probability and reasoning:
   1. [Cause name] (XX% probability): [Complete technical explanation]
   2. [Cause name] (XX% probability): [Complete technical explanation]

4. RECOMMENDED TESTS:
   Each test must include COMPLETE document references:
   
   CORRECT format: AWP 32-31-00-00-00A-520A-A, AMP 32-31-00-00-00A-720A-A
   WRONG format: AWP 39-A-AMP-00-X, section 32-31-01, IETP 033
   
   Include: procedure steps, expected results with tolerances, required tools.

5. CERTAINTY ASSESSMENT:
   Calculate score (0-100%) based on evidence quality.
   Explain the calculation methodology.
   State status: SAFE_TO_PROCEED (>=95%) or REQUIRE_EXPERT (<95%)

6. REFERENCES:
   List all documents with COMPLETE identifiers.
   CORRECT: AWP 32-31-00-00-00A-520A-A, AMP 32-31-00-00-00A-720A-A, IPD 32-31-00
   WRONG: IETP-AW139, manual section, AMP reference

FINAL CHECK BEFORE SUBMITTING:
- No ## or ** symbols anywhere in text?
- All part numbers complete (no truncation)?
- All document references have full identifiers?
- Text flows in proper paragraphs?
- All sentences properly punctuated?
""",
        expected_output=(
            "A professionally formatted diagnostic report in PLAIN TEXT with:\n"
            "- UPPERCASE section headers (no markdown)\n"
            "- Clear paragraph structure with proper sentences\n"
            "- Complete part numbers (no truncation)\n"
            "- Complete document references (full AWP/AMP identifiers)\n"
            "- Ranked likely causes with probabilities\n"
            "- Specific test procedures with complete references\n"
            "- Calculated certainty score with justification\n"
            "- Complete reference list with full document IDs"
        ),
        agent=validator,
    )


def create_supervision_task(supervisor: Agent) -> Task:
    return Task(
        description="""
QUALITY ASSURANCE REVIEW - FINAL INSPECTION
============================================

Review the Validator's report with extreme attention to detail.

FORMATTING VIOLATIONS CHECK (AUTOMATIC REJECTION IF ANY FOUND):

[ ] NO MARKDOWN SYMBOLS
    - Scan entire text for: ##, ###, **, ***, --, *, #, ---
    - If ANY found: REJECT immediately and specify location

[ ] UPPERCASE SECTION HEADERS
    - Headers must be UPPERCASE followed by colon (e.g., DIAGNOSIS SUMMARY:)
    - Not markdown headers (## Title)

[ ] COMPLETE REFERENCES
    - AWP references must be complete: AWP XX-XX-00-00-00A-XXXA-A format
    - AMP references must be complete: AMP XX-XX-00-00-00A-XXXA-A format
    - Reject incomplete like: "section 32-31-01", "IETP 033", "AMP reference"

[ ] COMPLETE PART NUMBERS
    - No truncated P/Ns like: "SK139-1225 (NT" or "Component ("
    - Every part number must be complete with no open parentheses
    - Reject if ANY part number appears cut off

CONTENT QUALITY CHECK:

[ ] DIAGNOSIS SUMMARY
    - Written in clear, professional paragraphs (not bullet points)
    - Explains the issue and root cause analysis

[ ] AFFECTED PARTS
    - Each part has: P/N, Description, Location, Action
    - All part numbers are complete and properly formatted

[ ] LIKELY CAUSES
    - Ranked by probability percentage with technical reasoning

[ ] RECOMMENDED TESTS
    - Each test has COMPLETE document reference (full AWP/AMP ID)
    - Expected results with tolerances specified

[ ] CERTAINTY SCORE
    - Score calculated and justified by evidence
    - Status clearly stated: SAFE_TO_PROCEED or REQUIRE_EXPERT

DECISION MATRIX:
- Markdown symbols found: REJECT - "Remove all markdown formatting"
- Incomplete references: REJECT - "Complete all document references"
- Truncated part numbers: REJECT - "Complete all part numbers"
- All formatting OK + certainty >= 95%: APPROVE
- All formatting OK + certainty < 95%: APPROVE with REQUIRE_EXPERT flag

ADD your supervisor notes explaining your decision.
""",
        expected_output=(
            "Quality assurance review in PLAIN TEXT with:\n"
            "- Formatting violation check results\n"
            "- Content quality verification\n"
            "- Final status: APPROVED / APPROVED WITH EXPERT REQUIRED / REJECTED\n"
            "- Supervisor notes explaining the decision\n"
            "- No markdown symbols in your own output"
        ),
        agent=supervisor,
    )


# =============================================================================
# DIAGNOSTIC CREW
# =============================================================================

class AW139DiagnosticCrew:
    """Main diagnostic crew with 3-tier hierarchical agents."""

    def __init__(self) -> None:
        self.rag_client = RAGClient()
        self.investigator = create_investigator_agent()
        self.validator = create_validator_agent()
        self.supervisor = create_supervisor_agent()

    def validate_rag_api(self) -> bool:
        try:
            health = self.rag_client.check_health()
            return health.get("status") == "healthy" and health.get("index_loaded", False)
        except Exception as e:
            logger.error(f"RAG API validation failed: {e}")
            return False

    def run_selftest(self) -> bool:
        logger.info("Running RAG self-test...")
        try:
            data = self.rag_client.query("AW139 fuel system troubleshooting", top_k=3)
            if "documents" in data and len(data.get("documents", [])) > 0:
                logger.info(f"[OK] RAG READY - {len(data['documents'])} documents retrieved")
                return True
            logger.warning("[WARNING] RAG returned no documents")
            return True
        except Exception as e:
            logger.error(f"[ERROR] RAG self-test failed: {e}")
            return False

    def run_diagnostic(self, query: str, serial_number: str = "31486") -> Dict[str, Any]:
        """Execute the full 3-agent diagnostic pipeline."""
        log_header("AW139 DIAGNOSTIC SYSTEM - 3-TIER ANALYSIS")
        logger.info(f"Query: {query}")
        logger.info(f"Serial Number: {serial_number}")
        print()

        investigation_task = create_investigation_task(query, serial_number, self.investigator)
        validation_task = create_validation_task(query, self.validator)
        supervision_task = create_supervision_task(self.supervisor)

        crew = Crew(
            agents=[self.investigator, self.validator, self.supervisor],
            tasks=[investigation_task, validation_task, supervision_task],
            process=Process.sequential,
            verbose=True
        )

        try:
            logger.info("Starting 3-tier diagnostic analysis...")
            start_time = time.time()
            result = crew.kickoff()
            elapsed = time.time() - start_time
            
            logger.info(f"Diagnostic completed in {elapsed:.1f} seconds")
            
            return {
                "success": True,
                "query": query,
                "serial_number": serial_number,
                "result": str(result),
                "processing_time_seconds": round(elapsed, 1)
            }

        except Exception as e:
            logger.error(f"Diagnostic execution failed: {e}")
            return {
                "success": False,
                "query": query,
                "error": str(e)
            }


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main() -> int:
    log_header("AW139 MAINTENANCE CREW - 3-TIER HIERARCHICAL SYSTEM")
    logger.info("Agents: Investigator -> Validator -> Supervisor")
    print()

    try:
        crew = AW139DiagnosticCrew()

        if not crew.validate_rag_api():
            logger.error("RAG API validation failed. Start with: python rag_api.py")
            return 1

        if not crew.run_selftest():
            logger.error("RAG self-test failed.")
            return 1

        test_query = "Starter generator #1 does not start"
        result = crew.run_diagnostic(test_query, serial_number="31486")

        print()
        log_separator("=")
        print("  FINAL DIAGNOSTIC REPORT")
        log_separator("=")
        print(result.get("result", "No result"))
        log_separator("=")

        return 0 if result.get("success") else 1

    except KeyboardInterrupt:
        logger.warning("Interrupted by user")
        return 130
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
