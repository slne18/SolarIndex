import { getBearerToken } from "@/lib/auth";
import { getAnonClient, getAdminClient } from "@/lib/supabase";
import { toOwnedRfp, type OwnedRfp, type RfpSubmissionRow } from "@/lib/rfp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

type PurchaseWithRfp = {
  created_at: string;
  montant_eur: number;
  rfp_submissions: RfpSubmissionRow | RfpSubmissionRow[] | null;
};

function rfpFromPurchase(row: PurchaseWithRfp): RfpSubmissionRow | null {
  const { rfp_submissions: rfp } = row;
  if (!rfp) return null;
  return Array.isArray(rfp) ? rfp[0] ?? null : rfp;
}

export type MyRfpItem = OwnedRfp & {
  purchased_at: string;
  montant_eur: number;
  listing_statut: RfpSubmissionRow["statut"];
};

// GET /api/my-rfps — appels d'offres achetés (coordonnées déposant).
export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Connexion requise." }, { status: 401, headers: NO_STORE });
  }
  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }
  const userId = userData.user.id;

  const { data, error } = await getAdminClient()
    .from("rfp_purchases")
    .select("created_at, montant_eur, rfp_submissions(*)")
    .eq("user_id", userId)
    .eq("statut", "completed")
    .order("created_at", { ascending: false });
  if (error) {
    return Response.json(
      { error: "Échec de lecture.", details: String(error) },
      { status: 500, headers: NO_STORE },
    );
  }

  const rows = (data ?? []) as unknown as PurchaseWithRfp[];
  const rfps: MyRfpItem[] = rows
    .map((row) => {
      const submission = rfpFromPurchase(row);
      if (!submission) return null;
      return {
        ...toOwnedRfp(submission),
        purchased_at: row.created_at,
        montant_eur: row.montant_eur,
        listing_statut: submission.statut,
      };
    })
    .filter((r): r is MyRfpItem => r !== null);

  return Response.json({ rfps, count: rfps.length }, { headers: NO_STORE });
}
