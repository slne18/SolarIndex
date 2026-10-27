import { getUserIdFromRequest } from "@/lib/auth";
import { getCatalogAccess } from "@/lib/catalog-access";
import { getCatalogStats } from "@/lib/catalog-stats";
import { LeadSort, ownedLeadIdsAmong, PAGE_SIZE, queryLeads } from "@/lib/db";
import { toPublicLead } from "@/lib/leads";
import { ANONYMOUS_CATALOG_ACCESS } from "@/lib/preview-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

const VALID_SORTS: LeadSort[] = ["valeur", "surface", "date"];
const VALID_FLAGS = ["URGENCE_ABSOLUE", "CONFORME_REQUIS"];

// GET /api/leads — catalogue public (masqué). Compte requis pour acheter.
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  const access = userId ? await getCatalogAccess(userId) : ANONYMOUS_CATALOG_ACCESS;

  const { searchParams } = new URL(req.url);

  const region = searchParams.get("region") || undefined;
  const departement = searchParams.get("departement") || undefined;
  const naf = searchParams.get("naf") || undefined;

  const flagRaw = searchParams.get("flag") || undefined;
  const flag = flagRaw && VALID_FLAGS.includes(flagRaw) ? flagRaw : undefined;

  const statut = searchParams.get("statut") || undefined;

  const surfaceMinRaw = searchParams.get("surface_min");
  const surfaceMin = surfaceMinRaw ? Number(surfaceMinRaw) : undefined;

  const sortRaw = (searchParams.get("sort") || "valeur") as LeadSort;
  const sort = VALID_SORTS.includes(sortRaw) ? sortRaw : "valeur";

  const tierRaw = searchParams.get("tier");
  const tierFilter =
    tierRaw === "premium" ? "premium" : tierRaw === "standard" ? "standard" : undefined;
  const dirigeantOnly = searchParams.get("dirigeant") === "1";

  const pageRaw = Number(searchParams.get("page") || "0");
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? Math.floor(pageRaw) : 0;

  try {
    const [{ rows, count }, catalogStats] = await Promise.all([
      queryLeads({
        region,
        departement,
        naf,
        flag,
        statut,
        surfaceMin,
        sort,
        page,
        tierFilter,
        dirigeantOnly,
      }),
      getCatalogStats(),
    ]);

    const publicLeads = rows.map(toPublicLead);
    let ownedLeadIds: string[] = [];
    if (userId && publicLeads.length > 0) {
      ownedLeadIds = await ownedLeadIdsAmong(
        userId,
        publicLeads.map((l) => l.id),
      );
    }

    return Response.json(
      {
        leads: publicLeads,
        ownedLeadIds,
        page,
        pageSize: PAGE_SIZE,
        total: count,
        totalPages: Math.ceil(count / PAGE_SIZE),
        catalog: {
          departementLock: access.departementLock,
          sampleRemaining: access.sampleRemaining,
          sampleDepartement: access.sampleDepartement,
        },
        catalogStats,
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { error: "Échec de la requête leads.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}
