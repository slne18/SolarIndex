#!/usr/bin/env bash
# Test live de bout en bout (Phase A) : démarre le serveur, ingère le CSV Gironde,
# vérifie GET /api/leads (masquage, pagination, filtres) et GET /api/leads/[id].
# Tout se déroule dans un seul process pour survivre au sandbox.
set -uo pipefail
cd "$(dirname "$0")/.."

LOG=/tmp/si_dev.log
rm -f "$LOG"
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!
cleanup() { kill "$DEV_PID" 2>/dev/null; pkill -P "$DEV_PID" 2>/dev/null; }
trap cleanup EXIT

echo "⏳ Attente du serveur Next..."
READY=""
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/api/leads || true)
  if [ -n "$code" ] && [ "$code" != "000" ]; then READY="$code"; break; fi
  sleep 1
done
if [ -z "$READY" ]; then echo "❌ Serveur injoignable"; tail -20 "$LOG"; exit 1; fi
echo "✅ Serveur prêt (HTTP $READY sur /api/leads)"
echo

echo "════════ 1) INGESTION (POST /api/ingest) ════════"
DEFAULT_DEPT=33 node scripts/ingest_csv.mjs leads_gironde.csv http://localhost:3000 || { echo "❌ ingestion KO"; tail -20 "$LOG"; exit 1; }
echo

echo "════════ 2) GET /api/leads (tri valeur) ════════"
curl -s "http://localhost:3000/api/leads?sort=valeur" -o /tmp/si_leads.json
node -e '
const d=require("/tmp/si_leads.json");
if(d.error){console.log("❌",d);process.exit(1);}
console.log("total:",d.total,"| pageSize:",d.pageSize,"| totalPages:",d.totalPages,"| renvoyés:",d.leads.length);
const l=d.leads[0];
console.log("Top lead →",l.ville,"("+l.departement+","+l.region+") | valeur:",l.valeur_chantier_eur,"€ | prix_lead:",l.prix_lead,"€ | flag:",l.flag_urgence);
const sensitive=["siren","raison_sociale","telephone","email_contact","adresse","id_parcelle","latitude","longitude","dirigeant_nom"];
const leaked=sensitive.filter(f=>f in l);
console.log("Champs sensibles dans la réponse publique:",leaked.length?("❌ FUITE: "+leaked):"AUCUN ✅");
'
echo

echo "════════ 3) GET /api/leads (filtres dept=33 + URGENCE + surface_min=20000) ════════"
curl -s "http://localhost:3000/api/leads?departement=33&flag=URGENCE_ABSOLUE&surface_min=20000" -o /tmp/si_f.json
node -e '
const d=require("/tmp/si_f.json");
console.log("Résultats filtrés:",d.total);
const ok=d.leads.every(l=>l.flag_urgence==="URGENCE_ABSOLUE"&&l.surface_m2>=20000&&l.departement==="33");
console.log("Tous conformes au filtre:",ok?"OUI ✅":"NON ❌");
'
echo

echo "════════ 4) GET /api/leads/[id] (visiteur non-acheteur → masqué) ════════"
ID=$(node -e 'console.log(require("/tmp/si_leads.json").leads[0].id)')
echo "Lead testé: $ID"
curl -s "http://localhost:3000/api/leads/$ID" -o /tmp/si_lead.json
node -e '
const d=require("/tmp/si_lead.json");
console.log("is_owned:",d.is_owned);
console.log("siren présent ?",("siren" in d.lead)?"❌ OUI (fuite)":"NON ✅");
console.log("ville (publique) présente ?",("ville" in d.lead)?"OUI ✅":"NON");
'
echo
echo "🏁 Test live terminé."
