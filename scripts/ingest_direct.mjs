// Ingestion directe CSV → Supabase (sans passer par le serveur Next).
// Réplique la logique de lib/leads.ts (mapping + région + skip 'vendu').
//   DEFAULT_DEPT=33 node scripts/ingest_direct.mjs data/samples/leads_gironde.csv
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEPT_REGION = {
  "01":"Auvergne-Rhône-Alpes","02":"Hauts-de-France","03":"Auvergne-Rhône-Alpes","04":"Provence-Alpes-Côte d'Azur","05":"Provence-Alpes-Côte d'Azur","06":"Provence-Alpes-Côte d'Azur","07":"Auvergne-Rhône-Alpes","08":"Grand Est","09":"Occitanie","10":"Grand Est","11":"Occitanie","12":"Occitanie","13":"Provence-Alpes-Côte d'Azur","14":"Normandie","15":"Auvergne-Rhône-Alpes","16":"Nouvelle-Aquitaine","17":"Nouvelle-Aquitaine","18":"Centre-Val de Loire","19":"Nouvelle-Aquitaine","21":"Bourgogne-Franche-Comté","22":"Bretagne","23":"Nouvelle-Aquitaine","24":"Nouvelle-Aquitaine","25":"Bourgogne-Franche-Comté","26":"Auvergne-Rhône-Alpes","27":"Normandie","28":"Centre-Val de Loire","29":"Bretagne","2A":"Corse","2B":"Corse","30":"Occitanie","31":"Occitanie","32":"Occitanie","33":"Nouvelle-Aquitaine","34":"Occitanie","35":"Bretagne","36":"Centre-Val de Loire","37":"Centre-Val de Loire","38":"Auvergne-Rhône-Alpes","39":"Bourgogne-Franche-Comté","40":"Nouvelle-Aquitaine","41":"Centre-Val de Loire","42":"Auvergne-Rhône-Alpes","43":"Auvergne-Rhône-Alpes","44":"Pays de la Loire","45":"Centre-Val de Loire","46":"Occitanie","47":"Nouvelle-Aquitaine","48":"Occitanie","49":"Pays de la Loire","50":"Normandie","51":"Grand Est","52":"Grand Est","53":"Pays de la Loire","54":"Grand Est","55":"Grand Est","56":"Bretagne","57":"Grand Est","58":"Bourgogne-Franche-Comté","59":"Hauts-de-France","60":"Hauts-de-France","61":"Normandie","62":"Hauts-de-France","63":"Auvergne-Rhône-Alpes","64":"Nouvelle-Aquitaine","65":"Occitanie","66":"Occitanie","67":"Grand Est","68":"Grand Est","69":"Auvergne-Rhône-Alpes","70":"Bourgogne-Franche-Comté","71":"Bourgogne-Franche-Comté","72":"Pays de la Loire","73":"Auvergne-Rhône-Alpes","74":"Auvergne-Rhône-Alpes","75":"Île-de-France","76":"Normandie","77":"Île-de-France","78":"Île-de-France","79":"Nouvelle-Aquitaine","80":"Hauts-de-France","81":"Occitanie","82":"Occitanie","83":"Provence-Alpes-Côte d'Azur","84":"Provence-Alpes-Côte d'Azur","85":"Pays de la Loire","86":"Nouvelle-Aquitaine","87":"Nouvelle-Aquitaine","88":"Grand Est","89":"Bourgogne-Franche-Comté","90":"Bourgogne-Franche-Comté","91":"Île-de-France","92":"Île-de-France","93":"Île-de-France","94":"Île-de-France","95":"Île-de-France","971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","976":"Mayotte",
};

const SURFACE_URGENCE = 10000;

function env(key) {
  const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : process.env[key];
}

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = []; let field = ""; let row = []; let q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) { if (c === '"') { if (clean[i+1] === '"') { field+='"'; i++; } else q=false; } else field+=c; }
    else if (c === '"') q=true;
    else if (c === ",") { row.push(field); field=""; }
    else if (c === "\n") { row.push(field); rows.push(row); row=[]; field=""; }
    else if (c === "\r") {}
    else field+=c;
  }
  if (field.length||row.length) { row.push(field); rows.push(row); }
  return rows;
}
const num = (v) => { if (v==null||v==="") return null; const n=Number(v); return Number.isNaN(n)?null:n; };
const istr = (v) => (v==null||v==="") ? null : String(v).replace(/\.0$/,"");

function deptFromInsee(insee) {
  if (!insee) return null;
  if (insee.startsWith("2A")||insee.startsWith("2B")) return insee.slice(0,2);
  if (insee.startsWith("97")||insee.startsWith("98")) return insee.slice(0,3);
  return insee.slice(0,2);
}

const DETECTION_SCORE = { libre: 0.9, a_verifier: 0.5, equipe: 0.2 };

function mapRow(h, cols, verify) {
  const r = {}; h.forEach((k,i)=> r[k]=cols[i]);
  const surface = num(r.surface_m2) ?? 0;
  const dept = process.env.DEFAULT_DEPT || deptFromInsee(istr(r.code_insee)) || "";
  const flagRaw = r.flag_urgence || "";
  const flag = flagRaw.toUpperCase().includes("URGENCE") ? "URGENCE_ABSOLUE"
    : (surface >= SURFACE_URGENCE ? "URGENCE_ABSOLUE" : "CONFORME_REQUIS");
  const gs = num(r.geocode_score);
  const sc = num(r.score_confiance);
  const bool = (v) => (v == null || v === "") ? null : String(v).toLowerCase() === "true";
  const baseScore = sc != null && sc > 0
    ? Math.min(1, Math.max(0, sc))
    : (gs && gs > 0 ? Math.min(1, Math.max(0, gs)) : 0.5);
  const SOURCE_SURFACE = ["osm","cadastre","osm_fallback"];
  const out = {
    osm_id: num(r.osm_id),
    osm_type: r.osm_type || null,
    latitude: num(r.latitude) ?? 0,
    longitude: num(r.longitude) ?? 0,
    departement: dept,
    region: DEPT_REGION[dept] ?? null,
    surface_m2: surface,
    flag_urgence: flag,
    nom_osm: r.nom_osm || null,
    adresse: r.adresse_cadastre || r.adresse_osm || null,
    ville: r.ville_ban || r.ville_osm || null,
    surface_solaire_m2: num(r.surface_solaire_m2),
    puissance_kwc: num(r.puissance_kwc),
    valeur_chantier_eur: num(r.valeur_chantier_eur),
    code_insee: istr(r.code_insee),
    id_parcelle: r.id_parcelle || null,
    siren: istr(r.siren),
    raison_sociale: r.raison_sociale || null,
    code_naf: r.code_naf || null,
    libelle_naf: r.libelle_naf || null,
    // Bypass 1 & 2 : provenance de la surface
    surface_tag_present: bool(r.surface_tag_present),
    surface_osm_m2: num(r.surface_osm_m2),
    surface_cadastrale_m2: num(r.surface_cadastrale_m2),
    source_surface: SOURCE_SURFACE.includes(r.source_surface) ? r.source_surface : "osm",
    // Bypass 3 : propriétaire foncier (Pappers Immobilier)
    proprietaire_foncier: r.proprietaire_foncier || null,
    siren_proprietaire_foncier: istr(r.siren_proprietaire_foncier),
    // Bypass 4 : validation vision ombrières
    vision_flag: bool(r.vision_flag) ?? false,
    vision_confidence: num(r.vision_confidence),
    vision_checked_at: r.vision_checked_at || null,
    // Bypass 5 : dérogations APER
    derogation_pente: bool(r.derogation_pente) ?? false,
    derogation_abf: bool(r.derogation_abf) ?? false,
    pente_pct: (() => { const v = num(r.pente_pct); return v != null && v > 999.9 ? 999.9 : v; })(),
    score_confiance: baseScore,
    statut: "disponible",
  };
  // En mode verify uniquement : on écrit l'état de détection (sinon on laisse
  // intactes les valeurs déjà en base pour ne pas effacer une vérification).
  if (verify) {
    const det = ["libre","a_verifier","equipe"].includes(r.detection) ? r.detection : "libre";
    out.pv_osm = String(r.pv_osm).toLowerCase() === "true";
    out.pv_overlap_pct = num(r.pv_overlap_pct);
    out.pv_registry_count = num(r.pv_registry_count);
    out.detection = det;
    out.verified_at = new Date().toISOString();
    // Le score du pipeline (bypasses) prime ; sinon proxy par état de détection.
    out.score_confiance = sc != null && sc > 0 ? baseScore : DETECTION_SCORE[det];
  }
  return out;
}

async function chunked(arr, size, fn) {
  for (let i = 0; i < arr.length; i += size) await fn(arr.slice(i, i + size));
}

async function main() {
  const path = process.argv[2];
  const rows = parseCSV(readFileSync(path, "utf8")).filter((r) => r.length > 1);
  const header = rows.shift();
  // Le fichier provient d'un run --verify si la colonne detection est renseignée.
  const detIdx = header.indexOf("detection");
  const verify = detIdx >= 0 && rows.some((c) => (c[detIdx] || "").trim() !== "");
  const mapped = rows.map((c) => mapRow(header, c, verify)).filter((l) => l.osm_id);
  const skippedNoSiren = mapped.length - mapped.filter((l) => l.siren).length;
  const withSiren = mapped.filter((l) => l.siren);
  const skippedNoParcelle = withSiren.length - withSiren.filter((l) => l.id_parcelle).length;
  const leads = withSiren.filter((l) => l.id_parcelle);
  if (leads.length === 0) { console.log(`  (0 lead avec SIREN + parcelle dans ${path})`); return; }

  // Récupère les statuts existants pour ne pas écraser les 'vendu'.
  const osmIds = leads.map((l) => l.osm_id);
  const vendu = new Set();
  const existing = new Set();
  await chunked(osmIds, 300, async (batch) => {
    const { data, error } = await supabase.from("leads").select("osm_id, statut").in("osm_id", batch);
    if (error) throw error;
    for (const e of data) { existing.add(Number(e.osm_id)); if (e.statut === "vendu") vendu.add(Number(e.osm_id)); }
  });

  const toUpsert = leads.filter((l) => !vendu.has(l.osm_id));
  const inserted = toUpsert.filter((l) => !existing.has(l.osm_id)).length;
  const updated = toUpsert.length - inserted;
  const skipped = leads.length - toUpsert.length;

  await chunked(toUpsert, 500, async (batch) => {
    const { error } = await supabase.from("leads").upsert(batch, { onConflict: "osm_id" });
    if (error) throw error;
  });

  console.log(`  → ${leads.length} leads | inserted:${inserted} updated:${updated} skipped:${skipped} sans_siren:${skippedNoSiren} sans_parcelle:${skippedNoParcelle}`);
}

main().catch((e) => { console.error("  ERREUR:", e.message || e); process.exit(1); });
