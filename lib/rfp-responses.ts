import { getAdminClient } from "./supabase";
import { getRfpById } from "./rfp-db";
import { isRfpDeposant } from "./rfp-withdrawal";
import type { TypeOffre } from "./rfp-offer-type";

export type RfpResponseView = {
  id: string;
  created_at: string;
  entreprise: string | null;
  responsable_nom: string | null;
  responsable_prenom: string | null;
  type_offre: TypeOffre;
  duree_contrat_ans: number | null;
};

export async function listRfpResponsesForDeposant(
  rfpId: string,
  userId: string,
  email: string,
): Promise<RfpResponseView[] | null> {
  const rfp = await getRfpById(rfpId);
  if (!rfp || !isRfpDeposant(rfp, userId, email)) return null;

  const supabase = getAdminClient();
  const { data: purchases, error } = await supabase
    .from("rfp_purchases")
    .select("id, created_at, user_id, type_offre, duree_contrat_ans")
    .eq("rfp_id", rfpId)
    .eq("statut", "completed")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!purchases?.length) return [];

  const userIds = [...new Set(purchases.map((p) => p.user_id).filter(Boolean))] as string[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, entreprise, responsable_nom, responsable_prenom")
    .in("id", userIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return purchases.map((p) => {
    const prof = p.user_id ? profileById.get(p.user_id) : undefined;
    return {
      id: p.id,
      created_at: p.created_at,
      entreprise: prof?.entreprise ?? null,
      responsable_nom: prof?.responsable_nom ?? null,
      responsable_prenom: prof?.responsable_prenom ?? null,
      type_offre: (p.type_offre as TypeOffre) ?? "devis_installation",
      duree_contrat_ans: p.duree_contrat_ans ?? null,
    };
  });
}
