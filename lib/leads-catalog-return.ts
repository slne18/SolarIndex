import { isLeadUuid } from "./seo-zones";

export const LEADS_CATALOG_RETURN_KEY = "solarindex:leads-catalog-return";

const DEFAULT_RETURN = "/leads?view=list";

function isLeadDetailPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 2 && parts[0] === "leads" && isLeadUuid(parts[1]);
}

/** Mémorise la liste catalogue (filtres, page, vue) avant d'ouvrir une fiche. */
export function rememberLeadsCatalogReturn(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (!path.startsWith("/leads") || isLeadDetailPath(path)) return;
  sessionStorage.setItem(
    LEADS_CATALOG_RETURN_KEY,
    path + window.location.search,
  );
}

export function readLeadsCatalogReturn(fallback = DEFAULT_RETURN): string {
  if (typeof window === "undefined") return fallback;
  const raw = sessionStorage.getItem(LEADS_CATALOG_RETURN_KEY);
  if (!raw) return fallback;
  const pathname = raw.split("?")[0] ?? "";
  if (!pathname.startsWith("/leads") || isLeadDetailPath(pathname)) return fallback;
  return raw;
}
