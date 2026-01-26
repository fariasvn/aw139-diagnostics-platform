#!/bin/bash
# Start both RAG and CrewAI servers for AW139 diagnostic system

echo "=========================================="
echo "Starting AW139 Diagnostic Backend Servers"
echo "=========================================="

# Kill any existing Python server processes
pkill -f "python rag_api.py" 2>/dev/null || true
pkill -f "python crew_server.py" 2>/dev/null || true
sleep 2

# Start RAG API on port 8000
echo ""
echo "[1] Starting RAG API on port 8000..."
nohup python rag_api.py > /tmp/rag_api.log 2>&1 &
RAG_PID=$!
echo "    RAG PID: $RAG_PID"

# Wait for RAG to initialize and load embeddings
sleep 5

# Start CrewAI server on port 9000
echo ""
echo "[2] Starting CrewAI Server on port 9000..."
nohup python crew_server.py > /tmp/crew.log 2>&1 &
CREW_PID=$!
echo "    CrewAI PID: $CREW_PID"

# Wait for servers to fully start
sleep 3

echo ""
echo "=========================================="
echo "Checking server logs..."
echo "=========================================="

echo ""
echo "--- RAG API Log (last 30 lines) ---"
tail -n 30 /tmp/rag_api.log

echo ""
echo "--- CrewAI Log (last 30 lines) ---"
tail -n 30 /tmp/crew.log

echo ""
echo "=========================================="
echo "Testing endpoints..."
echo "=========================================="

echo ""
echo "[TEST] RAG Health:"
curl -s http://127.0.0.1:8000/health 2>/dev/null || echo "ERROR: RAG not responding"

echo ""
echo ""
echo "[TEST] CrewAI Health:"
curl -s http://127.0.0.1:9000/health 2>/dev/null || echo "ERROR: CrewAI not responding"

echo ""
echo ""
echo "=========================================="
echo "Servers Running:"
echo "  - RAG API:     http://127.0.0.1:8000 (PID: $RAG_PID)"
echo "  - CrewAI API:  http://127.0.0.1:9000 (PID: $CREW_PID)"
echo "=========================================="
