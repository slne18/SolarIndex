/**
 * Simule ratio cadastre/OSM ∈ [0.5, 1.5] vs actuel [0.1, 3.0].
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SURFACE_MIN = 1500;
const SURFACE_URGENCE = 10_000;

function resolveSurface(osm, cad, ratioMin, ratioMax) {
  const surfaceOsm = Number(osm) || 0;
  const surfaceCad = cad != null ? Number(cad) : null;
  if (!surfaceCad || surfaceCad <= 0) {
    return { surface: surfaceOsm, source: "osm_fallback", ratio: null };
  }
  const ratio = surfaceOsm > 0 ? surfaceCad / surfaceOsm : 1;
  if (ratio > ratioMax || ratio < ratioMin) {
    return { surface: surfaceOsm, source: "osm_fallback", ratio };
  }
  return { surface: Math.round(surfaceCad * 10) / 10, source: "cadastre", ratio };
}

function isSellable(lead, surface) {
  if (lead.detection === "equipe") return false;
  if (!(lead.adresse ?? "").trim()) return false;
  if (!(lead.siren ?? "").trim() || !(lead.id_parcelle ?? "").trim()) return false;
  if (surface < SURFACE_MIN) return false;
  return true;
}

function isPremium(lead, source) {
  return (
    lead.detection === "libre" &&
    lead.surface_tag_present === true &&
    source === "cadastre" &&
    (lead.score_confiance ?? 0) >= 0.8 &&
    !!(lead.adresse ?? "").trim() &&
    !!(lead.siren ?? "").trim() &&
    !!(lead.id_parcelle ?? "").trim()
  );
}

loadEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const rows = [];
let offset = 0;
while (true) {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "surface_m2,surface_osm_m2,surface_cadastrale_m2,source_surface,flag_urgence,detection,siren,id_parcelle,adresse,surface_tag_present,score_confiance",
    )
    .range(offset, offset + 999);
  if (error) throw error;
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}

const cur = { min: 0.1, max: 3.0 };
const neu = { min: 0.5, max: 1.5 };

const s = {
  total: rows.length,
  before: { cadastre: 0, osm_fallback: 0, sellable: 0, premium: 0, urgence: 0 },
  after: { cadastre: 0, osm_fallback: 0, sellable: 0, premium: 0, urgence: 0 },
  flip: {
    cadToOsm: 0,
    osmToCad: 0,
    loseSellable: 0,
    gainSellable: 0,
    loseUrgence: 0,
    gainUrgence: 0,
    losePremium: 0,
    gainPremium: 0,
  },
  bands: {
    ratio_gt_15_lte_3: 0,
    ratio_gte_05_lt_01: 0,
    ratio_lt_05: 0,
    ratio_in_05_15: 0,
    ratio_gt_15: 0,
    // Seuils 1500 / 10k sur les bascules
    flip_highBand_loseUrgence: 0,
    flip_lowBand_gainUrgence: 0,
    flip_lowBand_loseSellable: 0,
    flip_highBand_loseSellable: 0,
    flip_lowBand_gainSellable: 0,
    cad_lt_1500_osm_ge_1500_now_cad: 0,
    cad_lt_1500_osm_ge_1500_would_stay_osm: 0,
  },
};

for (const lead of rows) {
  const osm = Number(lead.surface_osm_m2) || Number(lead.surface_m2) || 0;
  const cad = lead.surface_cadastrale_m2 != null ? Number(lead.surface_cadastrale_m2) : null;

  const atCur = resolveSurface(osm, cad, cur.min, cur.max);
  const atNeu = resolveSurface(osm, cad, neu.min, neu.max);

  if (atCur.source === "cadastre") s.before.cadastre++;
  else s.before.osm_fallback++;
  if (isSellable(lead, atCur.surface)) s.before.sellable++;
  if (isPremium(lead, atCur.source)) s.before.premium++;
  if (atCur.surface >= SURFACE_URGENCE) s.before.urgence++;

  if (atNeu.source === "cadastre") s.after.cadastre++;
  else s.after.osm_fallback++;
  if (isSellable(lead, atNeu.surface)) s.after.sellable++;
  if (isPremium(lead, atNeu.source)) s.after.premium++;
  if (atNeu.surface >= SURFACE_URGENCE) s.after.urgence++;

  if (atCur.ratio != null) {
    if (atCur.ratio > 1.5 && atCur.ratio <= 3) s.bands.ratio_gt_15_lte_3++;
    if (atCur.ratio >= 0.1 && atCur.ratio < 0.5) s.bands.ratio_gte_05_lt_01++;
    if (atCur.ratio < 0.5) s.bands.ratio_lt_05++;
    if (atCur.ratio >= 0.5 && atCur.ratio <= 1.5) s.bands.ratio_in_05_15++;
    if (atCur.ratio > 1.5) s.bands.ratio_gt_15++;
  }

  if (cad != null && cad > 0 && osm > 0 && cad < SURFACE_MIN && osm >= SURFACE_MIN) {
    if (atCur.source === "cadastre") s.bands.cad_lt_1500_osm_ge_1500_now_cad++;
    if (atNeu.source === "osm_fallback") s.bands.cad_lt_1500_osm_ge_1500_would_stay_osm++;
  }

  if (atCur.source !== atNeu.source || Math.abs(atCur.surface - atNeu.surface) > 0.5) {
    if (atCur.source === "cadastre" && atNeu.source === "osm_fallback") s.flip.cadToOsm++;
    if (atCur.source === "osm_fallback" && atNeu.source === "cadastre") s.flip.osmToCad++;

    const sellCur = isSellable(lead, atCur.surface);
    const sellNeu = isSellable(lead, atNeu.surface);
    if (sellCur && !sellNeu) s.flip.loseSellable++;
    if (!sellCur && sellNeu) s.flip.gainSellable++;

    const urgCur = atCur.surface >= SURFACE_URGENCE;
    const urgNeu = atNeu.surface >= SURFACE_URGENCE;
    if (urgCur && !urgNeu) s.flip.loseUrgence++;
    if (!urgCur && urgNeu) s.flip.gainUrgence++;

    const premCur = isPremium(lead, atCur.source);
    const premNeu = isPremium(lead, atNeu.source);
    if (premCur && !premNeu) s.flip.losePremium++;
    if (!premCur && premNeu) s.flip.gainPremium++;

    if (atCur.ratio != null && atCur.ratio > 1.5 && urgCur && !urgNeu) s.bands.flip_highBand_loseUrgence++;
    if (atCur.ratio != null && atCur.ratio < 0.5 && !urgCur && urgNeu) s.bands.flip_lowBand_gainUrgence++;
    if (atCur.ratio != null && atCur.ratio < 0.5 && sellCur && !sellNeu) s.bands.flip_lowBand_loseSellable++;
    if (atCur.ratio != null && atCur.ratio > 1.5 && sellCur && !sellNeu) s.bands.flip_highBand_loseSellable++;
    if (atCur.ratio != null && atCur.ratio < 0.5 && !sellCur && sellNeu) s.bands.flip_lowBand_gainSellable++;
  }
}

console.log(JSON.stringify({ current: cur, proposed: neu, stats: s }, null, 2));
