import { getUserIdFromRequest } from "@/lib/auth";
import { canViewLeadDepartement, getCatalogAccess } from "@/lib/catalog-access";
import { getCatalogStats } from "@/lib/catalog-stats";
import { LeadSort, PAGE_SIZE, queryLeads } from "@/lib/db";
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
  if (userId && access.needsOnboarding) {
    return Response.json(
      { error: "Choisissez votre département échantillon.", needsOnboarding: true },
      { status: 403, headers: NO_STORE },
    );
  }

  const { searchParams } = new URL(req.url);

  const region = searchParams.get("region") || undefined;
  let departement = searchParams.get("departement") || undefined;
  const naf = searchParams.get("naf") || undefined;

  if (access.departementLock) {
    departement = access.departementLock;
  }

  const flagRaw = searchParams.get("flag") || undefined;
  const flag = flagRaw && VALID_FLAGS.includes(flagRaw) ? flagRaw : undefined;

  const statut = searchParams.get("statut") || undefined;

  const surfaceMinRaw = searchParams.get("surface_min");
  const surfaceMin = surfaceMinRaw ? Number(surfaceMinRaw) : undefined;

  const sortRaw = (searchParams.get("sort") || "valeur") as LeadSort;
  const sort = VALID_SORTS.includes(sortRaw) ? sortRaw : "valeur";

  const hideAverifier = searchParams.get("fiabilite") === "verifies";
  const premiumOnly = searchParams.get("tier") === "premium";

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
        hideAverifier,
        premiumOnly,
      }),
      getCatalogStats(),
    ]);

    return Response.json(
      {
        leads: rows.map(toPublicLead),
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
