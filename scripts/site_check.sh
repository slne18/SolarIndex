#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null
LOG=/tmp/si_site.log
rm -f "$LOG"
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!
trap 'kill "$DEV_PID" 2>/dev/null; pkill -P "$DEV_PID" 2>/dev/null' EXIT

echo "⏳ Démarrage..."
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://localhost:3000/api/leads || true)
  [ -n "$code" ] && [ "$code" != "000" ] && break
  sleep 1
done

check() { # url, label, needle
  local body code
  body=$(curl -s --max-time 60 "http://localhost:3000$1")
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "http://localhost:3000$1")
  if [ "$code" = "200" ] && echo "$body" | grep -q "$3"; then
    echo "✅ $2 (HTTP 200, contient « $3 »)"
  else
    echo "❌ $2 (HTTP $code) — extrait :"; echo "$body" | head -c 300; echo
  fi
}

# Récupère un id de lead pour tester la fiche + checkout
LID=$(curl -s "http://localhost:3000/api/leads?sort=valeur" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).leads[0].id)}catch{console.log("")}})')

echo "Lead testé pour fiche/checkout : ${LID:-(aucun)}"
echo
check "/" "Landing page" "déjà identifiés"
check "/leads" "Dashboard leads" "Leads disponibles"
[ -n "$LID" ] && check "/leads/$LID" "Fiche lead" "Données propriétaire"
[ -n "$LID" ] && check "/checkout/$LID" "Checkout" "Confirmation"
check "/success" "Success" "Merci pour votre achat"
echo
echo "🏁 Vérification site terminée."
