import type { LeadRow } from "./types";

/** Colonnes exportées (tous les champs lead). */
export const ADMIN_LEAD_CSV_COLUMNS: (keyof LeadRow)[] = [
  "id",
  "created_at",
  "osm_id",
  "osm_type",
  "latitude",
  "longitude",
  "departement",
  "region",
  "surface_m2",
  "flag_urgence",
  "nom_osm",
  "adresse",
  "ville",
  "surface_solaire_m2",
  "puissance_kwc",
  "valeur_chantier_eur",
  "code_insee",
  "id_parcelle",
  "siren",
  "raison_sociale",
  "code_naf",
  "libelle_naf",
  "dirigeant_nom",
  "dirigeant_exploitant",
  "dirigeant_exploitant_qualite",
  "dirigeant_proprietaire",
  "dirigeant_proprietaire_qualite",
  "pv_osm",
  "pv_overlap_pct",
  "pv_registry_count",
  "detection",
  "verified_at",
  "surface_tag_present",
  "surface_osm_m2",
  "surface_cadastrale_m2",
  "source_surface",
  "proprietaire_foncier",
  "siren_proprietaire_foncier",
  "vision_flag",
  "vision_confidence",
  "vision_checked_at",
  "vision_surface_couverte_pct",
  "vision_ortho_date",
  "derogation_pente",
  "derogation_abf",
  "pente_pct",
  "score_confiance",
  "statut",
  "buyers_count",
  "acheteur_id",
  "vendu_at",
  "prix_vente_eur",
];

function escCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function leadsToCsv(rows: LeadRow[]): string {
  const header = ADMIN_LEAD_CSV_COLUMNS.join(";");
  const lines = rows.map((row) =>
    ADMIN_LEAD_CSV_COLUMNS.map((col) => escCsv(row[col])).join(";"),
  );
  return `\uFEFF${header}\n${lines.join("\n")}\n`;
}
