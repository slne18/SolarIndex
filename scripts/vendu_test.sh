#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
LOG=/tmp/si_dev3.log
rm -f "$LOG"
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!
trap 'kill "$DEV_PID" 2>/dev/null; pkill -P "$DEV_PID" 2>/dev/null' EXIT
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/api/leads || true)
  [ -n "$code" ] && [ "$code" != "000" ] && break
  sleep 1
done

echo "1) Marquage d'un lead comme 'vendu'..."
INFO=$(node scripts/vendu_check.mjs mark)
ID=$(node -e "console.log($INFO.id)")
OSM=$(node -e "console.log($INFO.osm_id)")
echo "   Lead vendu : id=$ID osm_id=$OSM"

echo "2) Tentative de réingestion de ce lead (doit être SKIPPED)..."
TOKEN=$(grep '^PIPELINE_INGEST_TOKEN=' .env.local | cut -d= -f2)
RES=$(curl -s -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "[{\"osm_id\":$OSM,\"surface_m2\":99999,\"departement\":\"33\"}]")
echo "   Réponse ingest : $RES"
node -e "const r=$RES; console.log('   Vérif : skipped =', r.skipped, r.skipped===1?'✅':'❌');"

echo "3) Vérif que la surface N'A PAS été écrasée (toujours protégée)..."
curl -s "http://localhost:3000/api/leads/$ID" -o /tmp/si_v.json
node -e "const d=require('/tmp/si_v.json'); console.log('   surface_m2 =', d.lead.surface_m2, d.lead.surface_m2!==99999?'(non écrasée) ✅':'(écrasée) ❌'); console.log('   statut =', d.lead.statut);"

echo "4) Remise à 'disponible'..."
node scripts/vendu_check.mjs reset "$ID"
echo "🏁 Test 'skip vendu' terminé."
