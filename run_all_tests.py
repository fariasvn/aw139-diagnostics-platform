#!/usr/bin/env python3
"""
Run RAG and CrewAI servers and execute tests.
This script keeps servers alive during testing.
"""
import subprocess
import time
import requests
import json
import signal
import sys
import os

RAG_PORT = 8000
CREW_PORT = 9000

def start_server(script_name, log_file, port):
    """Start a server subprocess."""
    proc = subprocess.Popen(
        [sys.executable, script_name],
        stdout=open(log_file, 'w'),
        stderr=subprocess.STDOUT,
        preexec_fn=os.setsid
    )
    print(f"Started {script_name} (PID: {proc.pid}) -> {log_file}")
    return proc

def wait_for_server(url, timeout=60, name="Server"):
    """Wait for server to be ready."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                print(f"{name} ready at {url}")
                return True
        except:
            pass
        time.sleep(1)
    print(f"TIMEOUT waiting for {name} at {url}")
    return False

def test_rag_query():
    """Test RAG query endpoint."""
    print("\n=== Testing RAG /query ===")
    try:
        resp = requests.post(
            f"http://127.0.0.1:{RAG_PORT}/query",
            json={"query": "Describe the AW139 main rotor servo leakage check procedure.", "top_k": 3},
            timeout=90
        )
        data = resp.json()
        docs = data.get("documents", []) or data.get("chunks", [])
        refs = data.get("references", [])
        print(f"Status: {resp.status_code}")
        print(f"Documents: {len(docs)}")
        print(f"Chunks: {len(data.get('chunks', []))}")
        print(f"References: {len(refs)}")
        if docs:
            print(f"First doc ATA: {docs[0].get('ata_identifier', 'N/A')}")
        return len(docs) > 0 or len(data.get("chunks", [])) > 0
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_crew_diagnose():
    """Test CrewAI diagnose endpoint."""
    print("\n=== Testing CrewAI /diagnose ===")
    try:
        resp = requests.post(
            f"http://127.0.0.1:{CREW_PORT}/diagnose",
            json={"query": "Describe the AW139 main rotor servo leakage check procedure."},
            timeout=120
        )
        data = resp.json()
        diagnosis = data.get("diagnosis", "")
        has_refs = "References" in diagnosis or "references" in str(data)
        print(f"Status: {resp.status_code}")
        print(f"Has References: {has_refs}")
        print(f"Diagnosis length: {len(diagnosis)}")
        return has_refs
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    print("=" * 60)
    print("AW139 RAG + CrewAI Integration Test")
    print("=" * 60)
    
    # Kill any existing servers
    os.system("pkill -f 'python rag_api.py' 2>/dev/null")
    os.system("pkill -f 'python crew_server.py' 2>/dev/null")
    time.sleep(2)
    
    # Start RAG server
    print("\n[1] Starting RAG API server...")
    rag_proc = start_server("rag_api.py", "/tmp/rag_api.log", RAG_PORT)
    
    # Wait for RAG to load (693MB embeddings file)
    print("[2] Waiting for RAG API to load embeddings (may take 15-20 seconds)...")
    rag_ok = wait_for_server(f"http://127.0.0.1:{RAG_PORT}/health", timeout=60, name="RAG API")
    
    if not rag_ok:
        print("\nRAG API failed to start. Log:")
        with open("/tmp/rag_api.log") as f:
            print(f.read()[-2000:])
        return 1
    
    # Check RAG health details
    try:
        health = requests.get(f"http://127.0.0.1:{RAG_PORT}/health", timeout=10).json()
        print(f"RAG Health: {json.dumps(health)}")
    except Exception as e:
        print(f"RAG Health check failed: {e}")
    
    # Start CrewAI server
    print("\n[3] Starting CrewAI server...")
    crew_proc = start_server("crew_server.py", "/tmp/crew.log", CREW_PORT)
    crew_ok = wait_for_server(f"http://127.0.0.1:{CREW_PORT}/health", timeout=30, name="CrewAI")
    
    if not crew_ok:
        print("\nCrewAI server failed to start. Log:")
        with open("/tmp/crew.log") as f:
            print(f.read()[-2000:])
    
    # Run tests
    print("\n" + "=" * 60)
    print("Running Integration Tests")
    print("=" * 60)
    
    rag_test = test_rag_query()
    crew_test = test_crew_diagnose() if crew_ok else False
    
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"RAG Query Test:  {'PASS' if rag_test else 'FAIL'}")
    print(f"CrewAI Test:     {'PASS' if crew_test else 'FAIL'}")
    print(f"Overall:         {'PASS' if (rag_test and crew_test) else 'FAIL'}")
    print("=" * 60)
    
    # Keep servers running for external tests
    print("\nServers still running. Use Ctrl+C to stop.")
    print(f"  RAG API:    http://127.0.0.1:{RAG_PORT}")
    print(f"  CrewAI API: http://127.0.0.1:{CREW_PORT}")
    
    # Wait for interrupt
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping servers...")
        rag_proc.terminate()
        crew_proc.terminate()
    
    return 0 if (rag_test and crew_test) else 1

if __name__ == "__main__":
    sys.exit(main())
