import { getUserIdFromRequest } from "@/lib/auth";
import { getCatalogAccess } from "@/lib/catalog-access";
import { getLeadById, userOwnsLead } from "@/lib/db";
import { isLeadSellable, toOwnedLead, toPublicLead } from "@/lib/leads";
import { isLeadSlotOpen } from "@/lib/lead-slots";
import { canPurchaseLeads } from "@/lib/profile-onboarding";
import { getUserProfile } from "@/lib/profile";
import { ANONYMOUS_CATALOG_ACCESS } from "@/lib/preview-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

// GET /api/leads/[id]
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getUserIdFromRequest(req);
  const access = userId ? await getCatalogAccess(userId) : ANONYMOUS_CATALOG_ACCESS;

  let lead;
  try {
    lead = await getLeadById(params.id);
  } catch (e) {
    return Response.json(
      { error: "Échec de la requête.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }

  if (!lead) {
    return Response.json(
      { error: "Lead introuvable." },
      { status: 404, headers: NO_STORE },
    );
  }

  const isOwned = userId ? await userOwnsLead(params.id, userId) : false;
  const profile = userId ? await getUserProfile(userId) : null;
  const canPurchase = profile ? canPurchaseLeads(profile.user_type) : false;

  if (!isOwned && !isLeadSlotOpen(lead)) {
    return Response.json(
      { error: "Lead introuvable." },
      { status: 404, headers: NO_STORE },
    );
  }

  if (!isOwned && lead.statut === "disponible" && !isLeadSellable(lead)) {
    return Response.json(
      { error: "Lead introuvable." },
      { status: 404, headers: NO_STORE },
    );
  }

  return Response.json(
    {
      lead: isOwned
        ? { ...toOwnedLead(lead), isOwned: true }
        : { ...toPublicLead(lead), isOwned: false },
      is_owned: isOwned,
      can_purchase: canPurchase,
      catalog: {
        departementLock: access.departementLock,
        sampleRemaining: access.sampleRemaining,
      },
    },
    { headers: NO_STORE },
  );
}
