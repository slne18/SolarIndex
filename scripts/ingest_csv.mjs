// Script de test d'ingestion : lit un CSV produit par le pipeline Python et le
// POST vers /api/ingest (en lots). Sert à valider la Phase A contre un vrai Supabase.
//
// Usage :
//   node scripts/ingest_csv.mjs [chemin_csv] [url_api]
//   PIPELINE_INGEST_TOKEN=xxx node scripts/ingest_csv.mjs leads_gironde.csv http://localhost:3000
//
// Le token est lu depuis PIPELINE_INGEST_TOKEN (ou .env.local).

import { readFileSync } from "node:fs";

const CSV_PATH = process.argv[2] || "leads_gironde.csv";
const BASE_URL = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const BATCH = 100;

// Charge le token depuis l'env, sinon depuis .env.local.
function loadToken() {
  if (process.env.PIPELINE_INGEST_TOKEN) return process.env.PIPELINE_INGEST_TOKEN;
  try {
    const env = readFileSync(".env.local", "utf8");
    const m = env.match(/^PIPELINE_INGEST_TOKEN=(.*)$/m);
    if (m) return m[1].trim();
  } catch {
    /* pas de .env.local */
  }
  return null;
}

// Parseur CSV minimal gérant les guillemets, virgules échappées et BOM.
function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Nettoie un nombre éventuellement écrit "33281.0" par pandas.
function num(v) {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
function intStr(v) {
  if (v === "" || v == null) return undefined;
  // pandas peut écrire "33281.0" pour des colonnes mixtes → on retire le .0
  return String(v).replace(/\.0$/, "");
}

function rowToPipelineLead(headers, cols) {
  const r = {};
  headers.forEach((h, i) => (r[h] = cols[i]));
  return {
    // Département forcé si fourni (le CSV Gironde n'a pas de colonne dédiée).
    departement: process.env.DEFAULT_DEPT || undefined,
    osm_id: num(r.osm_id),
    osm_type: r.osm_type || undefined,
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    surface_m2: num(r.surface_m2),
    flag_urgence: r.flag_urgence || undefined,
    nom_osm: r.nom_osm || undefined,
    operateur_osm: r.operateur_osm || undefined,
    adresse_osm: r.adresse_osm || undefined,
    ville_osm: r.ville_osm || undefined,
    surface_solaire_m2: num(r.surface_solaire_m2),
    puissance_kwc: num(r.puissance_kwc),
    valeur_chantier_eur: num(r.valeur_chantier_eur),
    adresse_cadastre: r.adresse_cadastre || undefined,
    code_insee: intStr(r.code_insee),
    geocode_score: num(r.geocode_score),
    id_parcelle: r.id_parcelle || undefined,
    siren: intStr(r.siren),
    raison_sociale: r.raison_sociale || undefined,
    code_naf: r.code_naf || undefined,
    libelle_naf: r.libelle_naf || undefined,
  };
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error("❌ PIPELINE_INGEST_TOKEN introuvable (env ou .env.local).");
    process.exit(1);
  }

  const rows = parseCSV(readFileSync(CSV_PATH, "utf8")).filter((r) => r.length > 1);
  const headers = rows.shift();
  const leads = rows.map((cols) => rowToPipelineLead(headers, cols)).filter((l) => l.osm_id);
  console.log(`📦 ${leads.length} leads à ingérer depuis ${CSV_PATH}`);

  const totals = { inserted: 0, updated: 0, skipped: 0 };
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const res = await fetch(`${BASE_URL}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(batch),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`❌ Lot ${i / BATCH + 1} échoué (HTTP ${res.status}) :`, json);
      process.exit(1);
    }
    totals.inserted += json.inserted || 0;
    totals.updated += json.updated || 0;
    totals.skipped += json.skipped || 0;
    console.log(`  Lot ${i / BATCH + 1} → ${JSON.stringify(json)}`);
  }
  console.log(`✅ Terminé : ${JSON.stringify(totals)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
