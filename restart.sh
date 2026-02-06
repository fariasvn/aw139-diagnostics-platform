#!/bin/bash
# AW139 Production Restart Script
# Ensures clean shutdown and port release before restarting services

echo "[RESTART] Stopping all PM2 processes..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null
sleep 2

echo "[RESTART] Releasing ports 5000, 8000, 9000..."
fuser -k 5000/tcp 2>/dev/null
fuser -k 8000/tcp 2>/dev/null
fuser -k 9000/tcp 2>/dev/null
sleep 3

echo "[RESTART] Verifying ports are free..."
for PORT in 5000 8000 9000; do
  if fuser ${PORT}/tcp 2>/dev/null; then
    echo "[RESTART] WARNING: Port ${PORT} still in use, force killing..."
    fuser -k -9 ${PORT}/tcp 2>/dev/null
    sleep 2
  else
    echo "[RESTART] Port ${PORT} is free"
  fi
done

echo "[RESTART] Starting services..."
cd /app/aw139
pm2 start ecosystem.config.cjs

echo "[RESTART] Waiting for services to initialize..."
sleep 15

echo "[RESTART] Status:"
pm2 status

echo ""
echo "[RESTART] Health checks:"
echo -n "  RAG API (8000): "
curl -s http://127.0.0.1:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'OK - {d[\"document_count\"]} docs')" 2>/dev/null || echo "FAILED"
echo -n "  CrewAI (9000):  "
curl -s http://127.0.0.1:9000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'OK - {d[\"message\"]}')" 2>/dev/null || echo "FAILED"
echo -n "  Web App (5000): "
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000 | grep -q "200" && echo "OK" || echo "FAILED"
