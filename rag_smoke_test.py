#!/usr/bin/env python3
"""
RAG Smoke Test - Verify RAG API functionality
"""
import requests
import json
import os

RAG_ENDPOINT = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint."""
    print("=" * 60)
    print("RAG SMOKE TEST")
    print("=" * 60)
    print()
    print("[1] Testing /health endpoint...")
    try:
        resp = requests.get(f"{RAG_ENDPOINT}/health", timeout=10)
        data = resp.json()
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {json.dumps(data, indent=2)}")
        return data.get("status") == "healthy" and data.get("index_loaded", False)
    except Exception as e:
        print(f"    ERROR: {e}")
        return False

def test_query():
    """Test query endpoint."""
    print()
    print("[2] Testing /query endpoint...")
    query = "Describe the AW139 main rotor servo leakage check procedure."
    try:
        resp = requests.post(
            f"{RAG_ENDPOINT}/query",
            json={"query": query, "top_k": 3, "include_context": True},
            timeout=90
        )
        data = resp.json()
        
        print(f"    Status: {resp.status_code}")
        print(f"    Response Keys: {list(data.keys())}")
        
        # Check documents/chunks
        docs = data.get("documents", []) or data.get("chunks", [])
        print(f"    Documents Count: {len(docs)}")
        
        if docs:
            first_doc = docs[0]
            print(f"    First Document Keys: {list(first_doc.keys()) if isinstance(first_doc, dict) else 'N/A'}")
            if isinstance(first_doc, dict):
                content = first_doc.get("content", "")[:200]
                print(f"    First Doc Content (200 chars): {content}")
        
        # Check references
        refs = data.get("references", [])
        print(f"    References Count: {len(refs)}")
        if refs:
            print(f"    First Reference: {refs[0][:100]}...")
        
        # Check answer
        answer = data.get("answer", "")
        print(f"    Answer Length: {len(answer)} chars")
        if answer:
            print(f"    Answer Preview: {answer[:200]}...")
        
        return len(docs) > 0
    except Exception as e:
        print(f"    ERROR: {e}")
        return False

def main():
    print()
    print(f"OPENAI_API_KEY configured: {bool(os.environ.get('OPENAI_API_KEY'))}")
    print()
    
    health_ok = test_health()
    query_ok = test_query()
    
    print()
    print("=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"  Health Check: {'PASS' if health_ok else 'FAIL'}")
    print(f"  Query Test:   {'PASS' if query_ok else 'FAIL'}")
    print(f"  Overall:      {'PASS' if (health_ok and query_ok) else 'FAIL'}")
    print("=" * 60)
    
    return 0 if (health_ok and query_ok) else 1

if __name__ == "__main__":
    exit(main())
