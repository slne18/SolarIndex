import { getAdminClient } from "./supabase";
import { ACCOUNT_DELETE_CONFIRMATION } from "./account-constants";

export { ACCOUNT_DELETE_CONFIRMATION };

/** Retire du catalogue les dépôts RFP liés au compte (avant suppression). */
export async function closeDeposantRfpSubmissions(userId: string, email: string): Promise<number> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  let q = supabase
    .from("rfp_submissions")
    .update({ statut: "ferme" })
    .in("statut", ["en_attente_verification", "en_attente_moderation", "publie"]);

  if (normalizedEmail) {
    q = q.or(`deposant_user_id.eq.${userId},contact_email.eq.${normalizedEmail}`);
  } else {
    q = q.eq("deposant_user_id", userId);
  }

  const { data, error } = await q.select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/** Anonymise les coordonnées des dépôts RFP avant effacement du compte. */
export async function anonymizeDeposantRfpSubmissions(userId: string, email: string): Promise<void> {
  const supabase = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  const placeholder = "supprime@solarindex.invalid";

  let q = supabase
    .from("rfp_submissions")
    .update({
      contact_nom: "Compte supprimé",
      contact_fonction: null,
      contact_email: placeholder,
      contact_telephone: "0000000000",
      notes_particulieres: null,
      photos_urls: null,
      verification_token: null,
      deposant_user_id: null,
    });

  if (normalizedEmail) {
    q = q.or(`deposant_user_id.eq.${userId},contact_email.eq.${normalizedEmail}`);
  } else {
    q = q.eq("deposant_user_id", userId);
  }

  const { error } = await q;
  if (error) throw error;
}

export async function deleteUserAccount(userId: string, email: string): Promise<void> {
  const supabase = getAdminClient();

  await closeDeposantRfpSubmissions(userId, email);
  await anonymizeDeposantRfpSubmissions(userId, email);

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw authError;
}
