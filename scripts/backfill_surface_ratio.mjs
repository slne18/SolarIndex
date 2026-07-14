/**
 * Recalcule surface_m2 / source_surface / flag_urgence (ratio 0.3–1.5×).
 * Usage: node scripts/backfill_surface_ratio.mjs [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const SURFACE_RATIO_MIN = 0.3;
const SURFACE_RATIO_MAX = 1.5;

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const RATIO_SOLAIRE = 0.5;
const M2_PAR_KWC = 5;
const COUT_KWC_EUR = 1200;
const SURFACE_URGENCE_CONFIRM_M2 = 11_000;

function computeFlagUrgence(surfaceM2) {
  const s = Number(surfaceM2) || 0;
  if (s > SURFACE_URGENCE_CONFIRM_M2) return "URGENCE_ABSOLUE";
  return "CONFORME_REQUIS";
}
const CONCURRENCY = 25;

function resolveSurface(surfaceOsm, surfaceCadastrale) {
  const osm = Number(surfaceOsm) || 0;
  const cad =
    surfaceCadastrale != null && surfaceCadastrale !== ""
      ? Number(surfaceCadastrale)
      : null;
  if (!cad || cad <= 0) return { surface: osm, source: "osm_fallback" };
  const ratio = osm > 0 ? cad / osm : 1;
  if (ratio > SURFACE_RATIO_MAX || ratio < SURFACE_RATIO_MIN) {
    return { surface: osm, source: "osm_fallback" };
  }
  return { surface: Math.round(cad * 10) / 10, source: "cadastre" };
}

function computeSolarPotential(surfaceM2) {
  const sSolaire = surfaceM2 * RATIO_SOLAIRE;
  const pKwc = sSolaire / M2_PAR_KWC;
  return {
    surface_solaire_m2: Math.round(sSolaire * 10) / 10,
    puissance_kwc: Math.round(pKwc * 10) / 10,
    valeur_chantier_eur: Math.round(pKwc * COUT_KWC_EUR),
  };
}

function recompute(lead) {
  const osm = Number(lead.surface_osm_m2) || Number(lead.surface_m2) || 0;
  const { surface, source } = resolveSurface(osm, lead.surface_cadastrale_m2);
  const solar = computeSolarPotential(surface);
  const flag = computeFlagUrgence(surface);
  return {
    surface_m2: surface,
    source_surface: source,
    flag_urgence: flag,
    ...solar,
  };
}

async function runPool(tasks, limit) {
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

loadEnv();
const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

console.log(`Ratio cadastre/OSM : [${SURFACE_RATIO_MIN}, ${SURFACE_RATIO_MAX}]`);

let offset = 0;
const PAGE = 1000;
let scanned = 0;
let updated = 0;
let unchanged = 0;
const pending = [];

while (true) {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id,surface_m2,surface_osm_m2,surface_cadastrale_m2,source_surface,flag_urgence,surface_solaire_m2,puissance_kwc,valeur_chantier_eur",
    )
    .order("id")
    .range(offset, offset + PAGE - 1);
  if (error) throw error;
  if (!data?.length) break;

  for (const lead of data) {
    scanned++;
    const payload = recompute(lead);
    const changed = Object.entries(payload).some(
      ([k, v]) => lead[k] !== v && !(lead[k] == null && v == null),
    );
    if (!changed) {
      unchanged++;
      continue;
    }
    if (dryRun && updated < 5) {
      console.log(
        `[dry-run] ${lead.id.slice(0, 8)}… ${lead.source_surface}→${payload.source_surface} ${lead.surface_m2}→${payload.surface_m2} m²`,
      );
    }
    if (!dryRun) {
      pending.push(() =>
        supabase.from("leads").update(payload).eq("id", lead.id).then(({ error: e }) => {
          if (e) throw e;
        }),
      );
    }
    updated++;
  }

  if (data.length < PAGE) break;
  offset += PAGE;
}

if (!dryRun && pending.length > 0) {
  console.log(`Mise à jour de ${pending.length} leads (×${CONCURRENCY} parallèle)…`);
  await runPool(pending, CONCURRENCY);
}

console.log(
  `✅ ${scanned} scannés · ${updated} ${dryRun ? "simulés" : "mis à jour"} · ${unchanged} inchangés`,
);
