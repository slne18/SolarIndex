import { getBearerToken } from "@/lib/auth";
import { getAnonClient, getAdminClient } from "@/lib/supabase";
import { toOwnedLead } from "@/lib/leads";
import { LeadRow } from "@/lib/types";
import { MAX_BUYERS_PER_LEAD } from "@/lib/lead-slots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

type PurchaseWithLead = {
  lead_delivered_at: string | null;
  leads: LeadRow | LeadRow[] | null;
};

function leadFromPurchase(row: PurchaseWithLead): LeadRow | null {
  const { leads } = row;
  if (!leads) return null;
  return Array.isArray(leads) ? leads[0] ?? null : leads;
}

// GET /api/my-leads — leads achetés par l'utilisateur connecté (données complètes).
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
    .from("purchases")
    .select("lead_delivered_at, leads(*)")
    .eq("user_id", userId)
    .eq("statut", "paid")
    .order("lead_delivered_at", { ascending: false });
  if (error) {
    return Response.json({ error: "Échec de lecture.", details: String(error) }, { status: 500, headers: NO_STORE });
  }

  const rows = (data ?? []) as unknown as PurchaseWithLead[];
  const leads = rows
    .map(leadFromPurchase)
    .filter((l): l is LeadRow => l !== null)
    .map((lead) => ({ ...toOwnedLead(lead), max_buyers: MAX_BUYERS_PER_LEAD }));
  return Response.json({ leads, count: leads.length }, { headers: NO_STORE });
}
