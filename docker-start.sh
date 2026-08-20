#!/bin/bash
# Monolith starter — ai-service (background) + Next.js (foreground).
# Kalau salah satu proses mati, container ikut restart (restart: unless-stopped).
# NOTE: pakai bash (bukan sh) untuk `wait -n`.
set -e

echo "Starting ai-service (Agno) di :8006…"
cd /opt/ai
/opt/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8006 &
AI_PID=$!

# Tunggu ai-service siap (maks ~15 dtk) sebelum Next jalan biar proxy pertama tidak 502.
i=0
until /opt/venv/bin/python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8006/healthz', timeout=2)" 2>/dev/null; do
  i=$((i+1))
  if [ "$i" -ge 15 ]; then
    echo "Peringatan: ai-service belum siap setelah 15s — lanjut tanpa menunggu."
    break
  fi
  sleep 1
done

echo "Starting Next.js di :${PORT:-3000}…"
cd /opt/web
node server.js &
NEXT_PID=$!

# Kalau salah satu proses mati → hentikan container (supaya restart bersama).
trap 'kill "$AI_PID" "$NEXT_PID" 2>/dev/null; exit 1' TERM INT
wait -n "$AI_PID" "$NEXT_PID"
kill "$AI_PID" "$NEXT_PID" 2>/dev/null
exit 1
