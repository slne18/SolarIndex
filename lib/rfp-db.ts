import { getAdminClient } from "./supabase";
import type { RfpSubmissionRow, RfpStatut } from "./rfp";

export const RFP_PAGE_SIZE = 20;

export interface RfpQueryOptions {
  departement?: string;
  region?: string;
  surfaceMin?: number;
  placesMin?: number;
  puissanceMin?: number;
  aoPublie?: boolean;
  parkingEtudie?: boolean;
  deadlineBefore?: string;
  deadlineAfter?: string;
  typeProprietaire?: string;
  /** Mix panneaux + végétal ou végétalisation seule (filtre paysagistes). */
  solutionPaysagiste?: boolean;
  page?: number;
}

export async function queryRfpSubmissions(opts: RfpQueryOptions = {}): Promise<{
  rows: RfpSubmissionRow[];
  count: number;
}> {
  const supabase = getAdminClient();
  const page = opts.page ?? 0;
  const from = page * RFP_PAGE_SIZE;
  const to = from + RFP_PAGE_SIZE - 1;

  let q = supabase
    .from("rfp_submissions")
    .select("*", { count: "exact" })
    .eq("statut", "publie")
    .order("created_at", { ascending: false });

  if (opts.departement) q = q.eq("departement", opts.departement);
  if (opts.region) q = q.eq("region", opts.region);
  if (typeof opts.surfaceMin === "number" && !Number.isNaN(opts.surfaceMin)) {
    q = q.gte("surface_estimee_m2", opts.surfaceMin);
  }
  if (typeof opts.placesMin === "number" && !Number.isNaN(opts.placesMin)) {
    q = q.gte("nombre_places", opts.placesMin);
  }
  if (opts.aoPublie === true) q = q.eq("ao_publie_officiellement", true);
  if (opts.aoPublie === false) q = q.eq("ao_publie_officiellement", false);
  if (opts.parkingEtudie === true) q = q.eq("parking_deja_etudie", true);
  if (opts.parkingEtudie === false) q = q.eq("parking_deja_etudie", false);
  if (opts.typeProprietaire) q = q.eq("type_proprietaire", opts.typeProprietaire);
  if (opts.solutionPaysagiste === true) {
    q = q.in("type_solution_recherchee", ["mixte_pv_vegetal", "vegetalisation_uniquement"]);
  }
  if (opts.deadlineBefore) q = q.lte("date_limite_offres", opts.deadlineBefore);
  if (opts.deadlineAfter) q = q.gte("date_limite_offres", opts.deadlineAfter);

  const { data, count, error } = await q.range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as RfpSubmissionRow[], count: count ?? 0 };
}

export async function getRfpById(id: string): Promise<RfpSubmissionRow | null> {
  const { data, error } = await getAdminClient()
    .from("rfp_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as RfpSubmissionRow) ?? null;
}

export async function userOwnsRfp(rfpId: string, userId: string): Promise<boolean> {
  const { data, error } = await getAdminClient()
    .from("rfp_purchases")
    .select("id")
    .eq("rfp_id", rfpId)
    .eq("user_id", userId)
    .eq("statut", "completed")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function createRfpSubmission(
  payload: Omit<RfpSubmissionRow, "id" | "created_at" | "acheteurs_count" | "acheteurs_max" | "deposant_user_id"> & {
    verification_token: string;
    deposant_user_id?: string | null;
  },
): Promise<RfpSubmissionRow> {
  const { data, error } = await getAdminClient()
    .from("rfp_submissions")
    .insert({
      ...payload,
      acheteurs_count: 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RfpSubmissionRow;
}

export async function verifyRfpEmail(token: string): Promise<RfpSubmissionRow | null> {
  const supabase = getAdminClient();
  const { data: row, error } = await supabase
    .from("rfp_submissions")
    .select("*")
    .eq("verification_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const nextStatut: RfpStatut =
    row.statut === "en_attente_verification" ? "en_attente_moderation" : row.statut;

  const { data: updated, error: updErr } = await supabase
    .from("rfp_submissions")
    .update({
      email_verifie: true,
      statut: nextStatut,
      verification_token: null,
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (updErr) throw updErr;
  return updated as RfpSubmissionRow;
}

/** Soumissions en attente de modération manuelle (email vérifié). */
export async function queryRfpModerationQueue(): Promise<RfpSubmissionRow[]> {
  const { data, error } = await getAdminClient()
    .from("rfp_submissions")
    .select("*")
    .eq("statut", "en_attente_moderation")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RfpSubmissionRow[];
}

export async function countRfpPendingModeration(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("rfp_submissions")
    .select("id", { count: "exact", head: true })
    .eq("statut", "en_attente_moderation");
  if (error) throw error;
  return count ?? 0;
}

export async function moderateRfpSubmission(
  id: string,
  action: "publie" | "rejete",
): Promise<RfpSubmissionRow> {
  const { data, error } = await getAdminClient()
    .from("rfp_submissions")
    .update({ statut: action })
    .eq("id", id)
    .eq("statut", "en_attente_moderation")
    .select("*")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Soumission introuvable ou déjà modérée.");
  return data as RfpSubmissionRow;
}

export async function updateRfpSubmission(
  id: string,
  updates: Partial<RfpSubmissionRow>,
  allowedStatuts: RfpStatut[],
): Promise<RfpSubmissionRow> {
  const { data, error } = await getAdminClient()
    .from("rfp_submissions")
    .update(updates)
    .eq("id", id)
    .in("statut", allowedStatuts)
    .select("*")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Appel d'offres introuvable ou non modifiable.");
  return data as RfpSubmissionRow;
}
