import requests
import time
import json
import difflib
from typing import List, Dict, Any

RAG_ENDPOINT = "http://127.0.0.1:8000/query"
CREW_ENDPOINT = "http://127.0.0.1:9000/diagnose"   # ajuste se necessário

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


def call_rag(query: str) -> Dict[str, Any]:
    """Call the RAG API directly."""
    try:
        response = requests.post(RAG_ENDPOINT, json={"query": query}, timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def call_crew(query: str) -> Dict[str, Any]:
    """Call the CrewAI diagnostic agent."""
    try:
        response = requests.post(CREW_ENDPOINT, json={"query": query}, timeout=25)
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def relevance_score(query: str, retrieved_text: str) -> float:
    """Rudimentary similarity check between query and RAG chunk."""
    if not retrieved_text:
        return 0.0
    return difflib.SequenceMatcher(None, query.lower(), retrieved_text.lower()).ratio()


def run_test() -> Dict[str, Any]:
    results = []
    start = time.time()

    for q in TEST_QUERIES:
        print(f"\n🔍 TESTING QUERY: {q}")

        rag = call_rag(q)
        crew = call_crew(q)

        rag_chunks = rag.get("chunks", [])
        rag_text = " ".join([c.get("content", "") for c in rag_chunks])

        score = relevance_score(q, rag_text)

        result = {
            "query": q,
            "rag_chunk_count": len(rag_chunks),
            "rag_relevance_score": score,
            "rag_error": rag.get("error"),

            "crew_has_references": "References" in json.dumps(crew),
            "crew_output_excerpt": str(crew)[:350]
        }

        print(f" - RAG chunks: {result['rag_chunk_count']}")
        print(f" - Relevance Score: {result['rag_relevance_score']:.2f}")
        print(f" - Crew includes references: {result['crew_has_references']}")

        results.append(result)

    end = time.time()

    summary = {
        "tests_run": len(results),
        "avg_relevance": sum(r["rag_relevance_score"] for r in results) / len(results),
        "avg_chunks": sum(r["rag_chunk_count"] for r in results) / len(results),
        "time": end - start,
        "results": results,
        "RAG_STATUS": "FAIL" if any(r["rag_chunk_count"] == 0 for r in results) else "PASS",
        "CREW_USING_RAG": "FAIL" if not any("References" in r["crew_output_excerpt"] for r in results) else "PASS",
    }

    return summary


if __name__ == "__main__":
    print("\n🚀 Running AW139 RAG Self-Test...")
    report = run_test()

    print("\n\n📊 FINAL REPORT")
    print(json.dumps(report, indent=4))

    with open("rag_selftest_report.json", "w") as f:
        json.dump(report, f, indent=4)

    print("\n📁 Report saved to rag_selftest_report.json")
