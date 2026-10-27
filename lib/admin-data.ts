import { getCatalogStats } from "./catalog-stats";
import { countRfpPendingModeration } from "./rfp-db";
import { getAdminClient } from "./supabase";
import { TERRITOIRE_PACK_EUR } from "./subscription";
import { DEPT_REGION } from "./regions";
import { VISION_COVERAGE_EQUIPE } from "./pv-overlap";
import type { LeadRow } from "./types";

const ADMIN_SORT_COLUMNS = new Set([
  "created_at",
  "valeur_chantier_eur",
  "surface_m2",
  "score_confiance",
  "buyers_count",
  "departement",
  "region",
  "ville",
  "statut",
  "detection",
  "pv_overlap_pct",
]);

export interface AdminStats {
  ca_mois_eur: number;
  ventes_totales: number;
  /** Tous les leads disponibles avec slot acheteur (< 3). */
  leads_disponibles: number;
  /** Filtres catalogue public (équipés exclus, enrichissement minimal). */
  catalogue_vendables: number;
  clients_actifs: number;
}

export interface AdminAlert {
  id: string;
  severity: "warning" | "danger" | "info";
  title: string;
  detail: string;
  count?: number;
}

export interface AdminVisionStats {
  urgences_brut: number;
  urgences_vendables: number;
  urgences_exclues_photo: number;
  urgences_ombriere_doute: number;
  urgences_vision_done: number;
  vision_backlog: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  alerts: AdminAlert[];
  vision: AdminVisionStats;
}

export interface AdminLeadQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  region?: string;
  departement?: string;
  statut?: string;
  detection?: string;
  flag?: string;
  search?: string;
}

export interface AdminClientRow {
  id: string;
  email: string | null;
  entreprise: string | null;
  telephone: string | null;
  region_cible: string | null;
  departements: string[] | null;
  plan: string | null;
  abonnement_actif: boolean;
  leads_achetes: number;
  notes_admin: string | null;
  total_spent_eur: number;
  pack_count: number;
  purchase_count: number;
}

export interface AdminClientsByRegion {
  region: string;
  clients: AdminClientRow[];
  total_spent_eur: number;
}

function monthStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const supabase = getAdminClient();
  const monthStart = monthStartIso();
  const activeSince = daysAgoIso(90);

  const [
    purchasesMonthRes,
    purchasesPaidRes,
    packsMonthRes,
    packsTotalRes,
    leadsDispoRes,
    recentBuyersRes,
    pendingOldRes,
    averifierBoughtRes,
    majicBacklogRes,
    majicJoinableRes,
    majicTableRes,
    catalogStats,
    rfpModerationRes,
  ] = await Promise.all([
    supabase
      .from("purchases")
      .select("montant_eur")
      .eq("statut", "paid")
      .gte("created_at", monthStart),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("statut", "paid"),
    supabase
      .from("subscription_periods")
      .select("id")
      .gte("periode_debut", monthStart),
    supabase.from("subscription_periods").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("statut", "disponible"),
    supabase
      .from("purchases")
      .select("user_id")
      .eq("statut", "paid")
      .gte("created_at", activeSince),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("statut", "pending")
      .lt("created_at", daysAgoIso(1)),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("detection", "a_verifier")
      .gt("buyers_count", 0),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("id_parcelle", "is", null)
      .is("proprietaire_foncier", null),
    supabase.rpc("count_leads_majic_joinable"),
    supabase
      .from("majic_proprietaires")
      .select("id_parcelle", { count: "exact", head: true }),
    getCatalogStats(),
    countRfpPendingModeration(),
  ]);

  const purchasesMonthEur = (purchasesMonthRes.data ?? []).reduce(
    (s, p) => s + (p.montant_eur ?? 0),
    0,
  );
  const packsMonth = packsMonthRes.data?.length ?? 0;
  const caMois = purchasesMonthEur + packsMonth * TERRITOIRE_PACK_EUR;

  const ventesTotales =
    (purchasesPaidRes.count ?? 0) + (packsTotalRes.count ?? 0);

  const recentBuyerIds = new Set(
    (recentBuyersRes.data ?? []).map((p) => p.user_id as string),
  );
  const { data: activeProfileRows } = await supabase
    .from("profiles")
    .select("id")
    .eq("abonnement_actif", true);
  const activeIds = new Set([
    ...(activeProfileRows ?? []).map((p) => p.id as string),
    ...recentBuyerIds,
  ]);
  const clientsActifsCount = activeIds.size;

  const alerts: AdminAlert[] = [];

  const rfpModerationCount = rfpModerationRes ?? 0;
  if (rfpModerationCount > 0) {
    alerts.push({
      id: "rfp-moderation",
      severity: "warning",
      title: "Consultations installateurs à modérer",
      detail: `${rfpModerationCount} projet(s) vérifiés par email — publier ou rejeter dans la section ci-dessous.`,
      count: rfpModerationCount,
    });
  }

  const pendingCount = pendingOldRes.count ?? 0;
  if (pendingCount > 0) {
    alerts.push({
      id: "pending-payments",
      severity: "danger",
      title: "Paiements pending > 24 h",
      detail: `${pendingCount} achat(s) en statut pending depuis plus de 24 h — vérifier Stripe / webhook.`,
      count: pendingCount,
    });
  }

  const averifierCount = averifierBoughtRes.count ?? 0;
  if (averifierCount > 0) {
    alerts.push({
      id: "averifier-bought",
      severity: "warning",
      title: "Leads « à vérifier » déjà achetés",
      detail: `${averifierCount} lead(s) avec detection=a_verifier ont été vendus — contacter les acheteurs si besoin.`,
      count: averifierCount,
    });
  }

  const majicBacklog = majicBacklogRes.count ?? 0;
  const majicJoinable =
    majicJoinableRes.error == null ? Number(majicJoinableRes.data ?? 0) : null;
  const majicRows = majicTableRes.count ?? 0;
  const majicLoaded = majicTableRes.error == null;

  alerts.push({
    id: "majic-reference",
    severity: majicLoaded && majicRows > 0 ? "info" : "warning",
    title: "Référentiel MAJIC (DGFiP)",
    detail: majicLoaded
      ? majicRows > 0
        ? `${majicRows.toLocaleString("fr-FR")} parcelle(s) PM en base — personnes morales uniquement (open data DGFiP).`
        : "Table majic_proprietaires vide — lancer pipeline/scripts/load_majic_parquet.py --from-leads."
      : "Table majic_proprietaires absente — appliquer migration 0013.",
    count: majicRows > 0 ? majicRows : undefined,
  });

  if (majicJoinable != null && majicJoinable > 0) {
    alerts.push({
      id: "majic-backlog",
      severity: "warning",
      title: "Propriétaire foncier — jointure MAJIC en attente",
      detail: `${majicJoinable.toLocaleString("fr-FR")} lead(s) enrichissable(s) via MAJIC — lancer pipeline/scripts/backfill_bypasses.py --mode proprietaire (ou RPC backfill_proprietaire_from_majic).`,
      count: majicJoinable,
    });
  } else if (majicBacklog > 0 && majicLoaded && majicRows > 0) {
    alerts.push({
      id: "majic-no-pm",
      severity: "info",
      title: "Leads sans propriétaire PM au cadastre",
      detail: `${majicBacklog.toLocaleString("fr-FR")} lead(s) avec parcelle mais sans PM MAJIC — normal (propriétaire privé ou parcelle absente du fichier DGFiP). Jointure MAJIC déjà à jour.`,
      count: majicBacklog,
    });
  } else if (majicBacklog > 0) {
    alerts.push({
      id: "majic-backlog",
      severity: "info",
      title: "Propriétaire foncier en attente",
      detail: `${majicBacklog.toLocaleString("fr-FR")} lead(s) avec parcelle sans propriétaire PM — charger MAJIC (pipeline/scripts/load_majic_parquet.py) puis backfill --mode proprietaire.`,
      count: majicBacklog,
    });
  }

  const visionBacklog =
    catalogStats.urgences_brut - catalogStats.urgences_vision_done;

  if (visionBacklog > 0) {
    alerts.push({
      id: "vision-backlog",
      severity: "warning",
      title: "Vision ortho urgences incomplète",
      detail: `${visionBacklog.toLocaleString("fr-FR")} urgence(s) absolue(s) disponible(s) sans analyse photo (% couverture) — relancer pipeline/scripts/backfill_bypasses.py --mode vision (ANTHROPIC_API_KEY).`,
      count: visionBacklog,
    });
  } else {
    alerts.push({
      id: "vision-urgences",
      severity: "info",
      title: "Vision ortho urgences (Bypass 4)",
      detail: `${catalogStats.urgences_vision_done.toLocaleString("fr-FR")}/${catalogStats.urgences_brut.toLocaleString("fr-FR")} analysées · ${catalogStats.urgences_exclues_photo.toLocaleString("fr-FR")} exclus (> ${VISION_COVERAGE_EQUIPE} % photo) · ${catalogStats.urgences_vendables.toLocaleString("fr-FR")} vendables · ${catalogStats.urgences_ombriere_doute.toLocaleString("fr-FR")} avec ombrière possible (≤ ${VISION_COVERAGE_EQUIPE} %).`,
      count: catalogStats.urgences_vendables,
    });
  }

  return {
    stats: {
      ca_mois_eur: caMois,
      ventes_totales: ventesTotales,
      leads_disponibles: leadsDispoRes.count ?? 0,
      catalogue_vendables: catalogStats.catalogue_total,
      clients_actifs: clientsActifsCount,
    },
    alerts,
    vision: {
      urgences_brut: catalogStats.urgences_brut,
      urgences_vendables: catalogStats.urgences_vendables,
      urgences_exclues_photo: catalogStats.urgences_exclues_photo,
      urgences_ombriere_doute: catalogStats.urgences_ombriere_doute,
      urgences_vision_done: catalogStats.urgences_vision_done,
      vision_backlog: visionBacklog,
    },
  };
}

export async function queryAdminLeads(
  opts: AdminLeadQuery,
): Promise<{ rows: LeadRow[]; count: number }> {
  const supabase = getAdminClient();
  const pageSize = Math.min(Math.max(opts.pageSize ?? 50, 1), 200);
  const page = opts.page ?? 0;
  const sortCol = ADMIN_SORT_COLUMNS.has(opts.sort ?? "") ? opts.sort! : "created_at";
  const ascending = opts.order === "asc";

  let query = supabase.from("leads").select("*", { count: "exact" });

  if (opts.region) query = query.eq("region", opts.region);
  if (opts.departement) query = query.eq("departement", opts.departement);
  if (opts.statut) query = query.eq("statut", opts.statut);
  if (opts.detection) query = query.eq("detection", opts.detection);
  if (opts.flag) query = query.eq("flag_urgence", opts.flag);

  const search = opts.search?.trim();
  if (search) {
    const q = `%${search.replace(/[%_]/g, "")}%`;
    query = query.or(
      `ville.ilike.${q},raison_sociale.ilike.${q},siren.ilike.${q},nom_osm.ilike.${q},adresse.ilike.${q}`,
    );
  }

  query = query.order(sortCol, { ascending, nullsFirst: false });
  const from = page * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as LeadRow[], count: count ?? 0 };
}

export async function exportAdminLeads(opts: AdminLeadQuery, limit = 5000): Promise<LeadRow[]> {
  const supabase = getAdminClient();
  const sortCol = ADMIN_SORT_COLUMNS.has(opts.sort ?? "") ? opts.sort! : "created_at";
  const ascending = opts.order === "asc";

  let query = supabase.from("leads").select("*");

  if (opts.region) query = query.eq("region", opts.region);
  if (opts.departement) query = query.eq("departement", opts.departement);
  if (opts.statut) query = query.eq("statut", opts.statut);
  if (opts.detection) query = query.eq("detection", opts.detection);
  if (opts.flag) query = query.eq("flag_urgence", opts.flag);

  const search = opts.search?.trim();
  if (search) {
    const q = `%${search.replace(/[%_]/g, "")}%`;
    query = query.or(
      `ville.ilike.${q},raison_sociale.ilike.${q},siren.ilike.${q},nom_osm.ilike.${q},adresse.ilike.${q}`,
    );
  }

  query = query.order(sortCol, { ascending, nullsFirst: false }).limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export async function getAdminClientsByRegion(): Promise<AdminClientsByRegion[]> {
  const supabase = getAdminClient();

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select(
      "id, email, entreprise, telephone, region_cible, departements, plan, abonnement_actif, leads_achetes, notes_admin",
    );
  if (profErr) throw profErr;

  const { data: purchases, error: purchErr } = await supabase
    .from("purchases")
    .select("user_id, montant_eur")
    .eq("statut", "paid");
  if (purchErr) throw purchErr;

  const { data: packs, error: packErr } = await supabase
    .from("subscription_periods")
    .select("user_id");
  if (packErr) throw packErr;

  const spentByUser = new Map<string, number>();
  for (const p of purchases ?? []) {
    const uid = p.user_id as string;
    spentByUser.set(uid, (spentByUser.get(uid) ?? 0) + (p.montant_eur ?? 0));
  }
  const packCountByUser = new Map<string, number>();
  for (const p of packs ?? []) {
    const uid = p.user_id as string;
    packCountByUser.set(uid, (packCountByUser.get(uid) ?? 0) + 1);
  }

  const clients: AdminClientRow[] = (profiles ?? []).map((prof) => {
    const purchaseEur = spentByUser.get(prof.id) ?? 0;
    const packCount = packCountByUser.get(prof.id) ?? 0;
    return {
      id: prof.id,
      email: prof.email,
      entreprise: prof.entreprise,
      telephone: prof.telephone,
      region_cible: prof.region_cible,
      departements: prof.departements,
      plan: prof.plan,
      abonnement_actif: prof.abonnement_actif ?? false,
      leads_achetes: prof.leads_achetes ?? 0,
      notes_admin: prof.notes_admin,
      purchase_count: (purchases ?? []).filter((p) => p.user_id === prof.id).length,
      pack_count: packCount,
      total_spent_eur: purchaseEur + packCount * TERRITOIRE_PACK_EUR,
    };
  });

  const byRegion = new Map<string, AdminClientRow[]>();

  for (const client of clients) {
    const region =
      client.region_cible?.trim() ||
      (client.departements?.[0] ? DEPT_REGION[client.departements[0]] : null) ||
      "Non renseigné";
    const list = byRegion.get(region) ?? [];
    list.push(client);
    byRegion.set(region, list);
  }

  return Array.from(byRegion.entries())
    .map(([region, regionClients]) => ({
      region,
      clients: regionClients.sort((a, b) => b.total_spent_eur - a.total_spent_eur),
      total_spent_eur: regionClients.reduce((s, c) => s + c.total_spent_eur, 0),
    }))
    .sort((a, b) => b.total_spent_eur - a.total_spent_eur);
}

export function profileIdsForRegion(
  clients: AdminClientsByRegion[],
  region: string,
): string[] {
  const group = clients.find((g) => g.region === region);
  return (group?.clients ?? [])
    .map((c) => c.id)
    .filter((id) => !!id);
}

export async function getProfileEmails(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .in("id", userIds);
  if (error) throw error;
  return (data ?? [])
    .map((p) => p.email)
    .filter((e): e is string => !!e && e.includes("@"));
}
