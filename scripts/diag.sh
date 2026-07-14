#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
LOG=/tmp/si_dev2.log
rm -f "$LOG"
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!
trap 'kill "$DEV_PID" 2>/dev/null; pkill -P "$DEV_PID" 2>/dev/null' EXIT

for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/api/leads || true)
  [ -n "$code" ] && [ "$code" != "000" ] && break
  sleep 1
done

echo "── /api/leads (aucun param) ──"
curl -s "http://localhost:3000/api/leads" | head -c 400; echo; echo
echo "── /api/leads?sort=valeur ──"
curl -s "http://localhost:3000/api/leads?sort=valeur" | head -c 400; echo; echo
echo "── /api/leads?sort=surface ──"
curl -s "http://localhost:3000/api/leads?sort=surface" | head -c 400; echo; echo
echo "── /api/leads?departement=33 ──"
curl -s "http://localhost:3000/api/leads?departement=33" | head -c 400; echo; echo
echo "── /api/leads?sort=date ──"
curl -s "http://localhost:3000/api/leads?sort=date" | head -c 400; echo
