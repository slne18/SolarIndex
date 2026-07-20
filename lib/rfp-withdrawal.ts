import type { RfpSubmissionRow } from "./rfp";
import { getAdminClient } from "./supabase";

export function isRfpDeposant(
  row: Pick<RfpSubmissionRow, "deposant_user_id" | "contact_email">,
  userId: string,
  email: string,
): boolean {
  if (row.deposant_user_id && row.deposant_user_id === userId) return true;
  const normalized = email.trim().toLowerCase();
  return !!normalized && row.contact_email.trim().toLowerCase() === normalized;
}

const WITHDRAWABLE_STATUTS = new Set([
  "en_attente_verification",
  "en_attente_moderation",
  "publie",
]);

export async function withdrawRfpSubmission(
  rfpId: string,
  userId: string,
  email: string,
): Promise<RfpSubmissionRow> {
  const supabase = getAdminClient();
  const { data: row, error } = await supabase
    .from("rfp_submissions")
    .select("*")
    .eq("id", rfpId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Appel d'offres introuvable.");

  const typed = row as RfpSubmissionRow & { deposant_user_id?: string | null };
  if (!isRfpDeposant(typed, userId, email)) {
    throw new Error("Vous n'êtes pas autorisé à retirer ce dépôt.");
  }
  if (!WITHDRAWABLE_STATUTS.has(typed.statut)) {
    throw new Error("Ce dépôt ne peut plus être retiré.");
  }

  const { data: updated, error: updErr } = await supabase
    .from("rfp_submissions")
    .update({ statut: "ferme" })
    .eq("id", rfpId)
    .select("*")
    .single();
  if (updErr) throw updErr;
  return updated as RfpSubmissionRow;
}

export async function queryRfpSubmissionsByDeposant(
  userId: string,
  email: string,
): Promise<RfpSubmissionRow[]> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  let q = supabase.from("rfp_submissions").select("*").order("created_at", { ascending: false });

  if (normalizedEmail) {
    q = q.or(`deposant_user_id.eq.${userId},contact_email.eq.${normalizedEmail}`);
  } else {
    q = q.eq("deposant_user_id", userId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RfpSubmissionRow[];
}
