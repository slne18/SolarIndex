import { getAdminClient } from "./supabase";
import { VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import { SURFACE_GRAY_LOW_MAX_M2 } from "./surface-thresholds";

export interface CatalogStats {
  /** Urgences absolues disponibles avant exclusion photo > 45 %. */
  urgences_brut: number;
  /** Urgences exclues du catalogue (detection = equipe, photo > 45 %). */
  urgences_exclues_photo: number;
  /** Urgences vendables après filtre catalogue. */
  urgences_vendables: number;
  /** Urgences avec ombrière suspectée (vision_flag) mais ≤ 45 %. */
  urgences_ombriere_doute: number;
  /** Urgences avec analyse ortho complète (vision_surface_couverte_pct renseigné). */
  urgences_vision_done: number;
  /** Toutes opportunités catalogue (tous flags). */
  catalogue_total: number;
}

function baseCatalogQuery() {
  return getAdminClient()
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("statut", "disponible")
    .not("siren", "is", null)
    .not("id_parcelle", "is", null)
    .not("adresse", "is", null)
    .neq("adresse", "")
    .neq("detection", "equipe")
    .or(
      `vision_surface_couverte_pct.is.null,vision_surface_couverte_pct.lte.${VISION_COVERAGE_EQUIPE}`,
    )
    .gt("surface_m2", SURFACE_GRAY_LOW_MAX_M2);
}

/** Compte les leads vendables du catalogue (filtres catalogue standard). */
export function baseCatalogCountQuery() {
  return baseCatalogQuery();
}

/** Leads premium : photo aérienne vérifiée et fiche de moins de 6 mois. */
export function countPremiumLeadsQuery(createdAfterIso: string) {
  return baseCatalogQuery()
    .not("vision_checked_at", "is", null)
    .gte("created_at", createdAfterIso);
}

/** Leads standard : inclus dans l'abonnement plateforme (inverse du premium). */
export function applyStandardTierFilter<T extends { or: (filters: string) => T }>(
  query: T,
  createdBeforeIso: string,
): T {
  return query.or(`vision_checked_at.is.null,created_at.lt."${createdBeforeIso}"`);
}

export async function getCatalogStats(): Promise<CatalogStats> {
  const supabase = getAdminClient();
  const urgenceBase = {
    flag_urgence: "URGENCE_ABSOLUE",
    statut: "disponible",
  } as const;

  const [
    urgencesBrutRes,
    urgencesEquipeRes,
    urgencesVendablesRes,
    urgencesOmbriereRes,
    urgencesVisionDoneRes,
    catalogueTotalRes,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .match(urgenceBase),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .match(urgenceBase)
      .eq("detection", "equipe"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .match(urgenceBase)
      .neq("detection", "equipe")
      .or(
        `vision_surface_couverte_pct.is.null,vision_surface_couverte_pct.lte.${VISION_COVERAGE_EQUIPE}`,
      )
      .not("siren", "is", null)
      .not("id_parcelle", "is", null)
      .not("adresse", "is", null)
      .neq("adresse", "")
      .gt("surface_m2", SURFACE_GRAY_LOW_MAX_M2),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .match(urgenceBase)
      .eq("vision_flag", true)
      .neq("detection", "equipe"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .match(urgenceBase)
      .not("vision_surface_couverte_pct", "is", null),
    baseCatalogQuery(),
  ]);

  for (const res of [
    urgencesBrutRes,
    urgencesEquipeRes,
    urgencesVendablesRes,
    urgencesOmbriereRes,
    urgencesVisionDoneRes,
    catalogueTotalRes,
  ]) {
    if (res.error) throw res.error;
  }

  return {
    urgences_brut: urgencesBrutRes.count ?? 0,
    urgences_exclues_photo: urgencesEquipeRes.count ?? 0,
    urgences_vendables: urgencesVendablesRes.count ?? 0,
    urgences_ombriere_doute: urgencesOmbriereRes.count ?? 0,
    urgences_vision_done: urgencesVisionDoneRes.count ?? 0,
    catalogue_total: catalogueTotalRes.count ?? 0,
  };
}
