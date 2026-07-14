import { getAdminClient } from "./supabase";
import type { RfpSubmissionRow, RfpStatut } from "./rfp";

export const RFP_PAGE_SIZE = 20;

export interface RfpQueryOptions {
  departement?: string;
  region?: string;
  surfaceMin?: number;
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
  payload: Omit<RfpSubmissionRow, "id" | "created_at" | "acheteurs_count" | "acheteurs_max"> & {
    verification_token: string;
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
