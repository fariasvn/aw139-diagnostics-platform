#!/usr/bin/env python3
"""
Combined server launcher and self-test runner.
Runs both servers in background threads, then executes the self-test.
"""
import subprocess
import threading
import time
import requests
import json
import os
import signal
import sys

RAG_PORT = 8000
CREW_PORT = 9000

def run_server(script, log_file):
    """Run a server and redirect output to log file."""
    with open(log_file, 'w') as f:
        proc = subprocess.Popen(
            [sys.executable, script],
            stdout=f,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid
        )
    return proc

def wait_for_server(url, timeout=60, name="Server"):
    """Wait for server to respond."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                print(f"[OK] {name} ready")
                return True
        except:
            pass
        time.sleep(1)
    print(f"[FAIL] {name} timeout")
    return False

def run_selftest():
    """Run the frontend_rag_selftest.py and capture results."""
    import difflib
    
    RAG_ENDPOINT = "http://127.0.0.1:8000/query"
    CREW_ENDPOINT = "http://127.0.0.1:9000/diagnose"

    TEST_QUERIES = [
        "Describe the AW139 main rotor servo leakage check procedure.",
        "Explain the AW139 MGB chip detector logic.",
        "What are the steps to replace the AW139 hydraulic pump?",
        "Torque values for AW139 tail rotor pitch link installation.",
        "What triggers the AW139 HYD PRESS caution?",
        "Explain AW139 FADEC auto-relight logic.",
        "AW139 tail rotor gearbox oil type and servicing.",
        "What is the AW139 Nr sensor troubleshooting procedure?",
        "AW139 battery overheat immediate actions.",
        "Explain AW139 DC Bus Tie logic."
    ]

    def call_rag(query):
        try:
            response = requests.post(RAG_ENDPOINT, json={"query": query}, timeout=30)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def call_crew(query):
        try:
            response = requests.post(CREW_ENDPOINT, json={"query": query}, timeout=60)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def relevance_score(query, retrieved_text):
        if not retrieved_text:
            return 0.0
        return difflib.SequenceMatcher(None, query.lower(), retrieved_text.lower()).ratio()

    results = []
    start = time.time()

    for q in TEST_QUERIES:
        print(f"\n🔍 TESTING: {q[:50]}...")

        rag = call_rag(q)
        crew = call_crew(q)

        rag_chunks = rag.get("chunks", []) or rag.get("documents", [])
        rag_text = " ".join([c.get("content", "") for c in rag_chunks if isinstance(c, dict)])

        score = relevance_score(q, rag_text)

        result = {
            "query": q,
            "rag_chunk_count": len(rag_chunks),
            "rag_relevance_score": score,
            "rag_error": rag.get("error"),
            "crew_has_references": "References" in json.dumps(crew),
            "crew_output_excerpt": str(crew)[:350]
        }

        print(f"   RAG chunks: {result['rag_chunk_count']}")
        print(f"   Relevance: {result['rag_relevance_score']:.2f}")
        print(f"   Crew refs: {result['crew_has_references']}")

        results.append(result)

    end = time.time()

    summary = {
        "tests_run": len(results),
        "avg_relevance": sum(r["rag_relevance_score"] for r in results) / len(results),
        "avg_chunks": sum(r["rag_chunk_count"] for r in results) / len(results),
        "time": end - start,
        "results": results,
        "RAG_STATUS": "FAIL" if any(r["rag_chunk_count"] == 0 for r in results) else "PASS",
        "CREW_USING_RAG": "FAIL" if not any(r["crew_has_references"] for r in results) else "PASS",
    }

    return summary

def main():
    print("=" * 60)
    print("AW139 Self-Test Runner with Integrated Servers")
    print("=" * 60)
    
    # Kill existing
    os.system("pkill -f 'python rag_api.py' 2>/dev/null")
    os.system("pkill -f 'python crew_server.py' 2>/dev/null")
    time.sleep(2)
    
    # Start servers
    print("\n[1] Starting RAG API...")
    rag_proc = run_server("rag_api.py", "/tmp/rag_api.log")
    
    print("[2] Waiting for RAG to load embeddings (15-20s)...")
    rag_ok = wait_for_server(f"http://127.0.0.1:{RAG_PORT}/health", timeout=60, name="RAG API")
    
    if not rag_ok:
        print("RAG failed. Log:")
        os.system("tail -30 /tmp/rag_api.log")
        return 1
    
    print("\n[3] Starting CrewAI...")
    crew_proc = run_server("crew_server.py", "/tmp/crew.log")
    crew_ok = wait_for_server(f"http://127.0.0.1:{CREW_PORT}/health", timeout=30, name="CrewAI")
    
    if not crew_ok:
        print("CrewAI failed. Log:")
        os.system("tail -30 /tmp/crew.log")
    
    # Run self-test
    print("\n" + "=" * 60)
    print("Running Self-Test")
    print("=" * 60)
    
    try:
        report = run_selftest()
        
        print("\n\n📊 FINAL REPORT")
        print(json.dumps(report, indent=4))
        
        with open("rag_selftest_report.json", "w") as f:
            json.dump(report, f, indent=4)
        
        print("\n📁 Report saved to rag_selftest_report.json")
        
        print("\n" + "=" * 60)
        print(f"RAG_STATUS: {report['RAG_STATUS']}")
        print(f"CREW_USING_RAG: {report['CREW_USING_RAG']}")
        print("=" * 60)
        
        success = report['RAG_STATUS'] == 'PASS' and report['CREW_USING_RAG'] == 'PASS'
        
    except Exception as e:
        print(f"Test error: {e}")
        success = False
    
    # Cleanup
    print("\nStopping servers...")
    try:
        os.killpg(os.getpgid(rag_proc.pid), signal.SIGTERM)
        os.killpg(os.getpgid(crew_proc.pid), signal.SIGTERM)
    except:
        pass
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
