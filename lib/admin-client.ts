import type { AdminLeadQuery } from "./admin-data";

export const ADMIN_TOKEN_STORAGE_KEY = "solarindex_admin_token";

export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function setStoredAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredAdminToken();
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export function leadQueryToSearchParams(q: AdminLeadQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.page != null) p.set("page", String(q.page));
  if (q.pageSize != null) p.set("pageSize", String(q.pageSize));
  if (q.sort) p.set("sort", q.sort);
  if (q.order) p.set("order", q.order);
  if (q.region) p.set("region", q.region);
  if (q.departement) p.set("departement", q.departement);
  if (q.statut) p.set("statut", q.statut);
  if (q.detection) p.set("detection", q.detection);
  if (q.flag) p.set("flag", q.flag);
  if (q.search) p.set("search", q.search);
  return p;
}

export function parseAdminLeadQuery(url: URL): AdminLeadQuery {
  return {
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : 0,
    pageSize: url.searchParams.has("pageSize")
      ? Number(url.searchParams.get("pageSize"))
      : 50,
    sort: url.searchParams.get("sort") ?? undefined,
    order: (url.searchParams.get("order") as "asc" | "desc") ?? "desc",
    region: url.searchParams.get("region") ?? undefined,
    departement: url.searchParams.get("departement") ?? undefined,
    statut: url.searchParams.get("statut") ?? undefined,
    detection: url.searchParams.get("detection") ?? undefined,
    flag: url.searchParams.get("flag") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  };
}
