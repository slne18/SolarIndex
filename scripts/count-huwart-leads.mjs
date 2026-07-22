/**
 * Compte les leads éligibles à l'alerte loi Huwart (recouvrement ombrière ≥ 17,5 %).
 * Usage: node --experimental-strip-types scripts/count-huwart-leads.mjs
 * (charge .env.local via dotenv si présent — sinon variables d'environnement)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const HUWART_MIN = 17.5;
const OSM_MIN = HUWART_MIN / 100;

function isUrgenceAbsolue(flag) {
  return flag === "URGENCE_ABSOLUE";
}

function isVisionEquipped(pct) {
  return pct != null && !Number.isNaN(pct) && pct > 45;
}

function leadOmbriereCoveragePct(lead) {
  if (isUrgenceAbsolue(lead.flag_urgence)) {
    if (!lead.vision_checked_at) return null;
    const pct = lead.vision_surface_couverte_pct;
    return pct != null && !Number.isNaN(pct) ? pct : null;
  }
  const ratio = lead.pv_overlap_pct;
  if (ratio == null || Number.isNaN(ratio)) return null;
  return ratio * 100;
}

function isHuwartLead(lead) {
  const pct = leadOmbriereCoveragePct(lead);
  return pct != null && pct >= HUWART_MIN;
}

function isHuwartScorePenalty(lead) {
  if (!isHuwartLead(lead)) return false;
  if (lead.detection === "equipe") return false;
  if (isVisionEquipped(lead.vision_surface_couverte_pct)) return false;
  const overlap = lead.pv_overlap_pct ?? 0;
  if (overlap >= 0.5) return false;
  return true;
}

async function fetchAll() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, flag_urgence, pv_overlap_pct, vision_surface_couverte_pct, vision_checked_at, detection, statut, surface_m2",
      )
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

const leads = await fetchAll();
const huwart = leads.filter(isHuwartLead);
const penalized = leads.filter(isHuwartScorePenalty);
const osmOnly = huwart.filter((l) => !isUrgenceAbsolue(l.flag_urgence));
const visionUrgences = huwart.filter((l) => isUrgenceAbsolue(l.flag_urgence));

console.log(JSON.stringify({
  total_leads: leads.length,
  huwart_eligible: huwart.length,
  huwart_score_penalty: penalized.length,
  breakdown: {
    osm_coverage_gte_175pct: osmOnly.length,
    urgences_vision_gte_175pct: visionUrgences.length,
  },
  quick_sql_proxy: {
    pv_overlap_pct_gte_0175: leads.filter((l) => (l.pv_overlap_pct ?? 0) >= OSM_MIN).length,
    vision_gte_175: leads.filter((l) => (l.vision_surface_couverte_pct ?? 0) >= HUWART_MIN).length,
  },
}, null, 2));
