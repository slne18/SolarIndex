const API_RECHERCHE = "https://recherche-entreprises.api.gouv.fr/search";

export interface EntrepriseSuggestion {
  label: string;
  siren: string;
  siret: string;
  ville: string;
}

function formatSiren(siren: string): string {
  const d = siren.replace(/\D/g, "").slice(0, 9);
  if (d.length !== 9) return siren;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
}

export async function searchEntreprisesFr(
  query: string,
  limit = 8,
): Promise<EntrepriseSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const url = new URL(API_RECHERCHE);
    url.searchParams.set("q", q);
    url.searchParams.set("page", "1");
    url.searchParams.set("per_page", String(Math.min(25, Math.max(1, limit))));

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const results = json.results ?? [];

    return results.slice(0, limit).map(
      (r: {
        siren?: string | number;
        nom_complet?: string;
        nom_raison_sociale?: string;
        siege?: { siret?: string; libelle_commune?: string };
      }) => {
        const siren = String(r.siren ?? "").replace(/\D/g, "").slice(0, 9);
        const label = r.nom_complet || r.nom_raison_sociale || "";
        const siret = String(r.siege?.siret ?? "").replace(/\D/g, "").slice(0, 14);
        return {
          label,
          siren: formatSiren(siren),
          siret,
          ville: r.siege?.libelle_commune ?? "",
        };
      },
    ).filter((r: EntrepriseSuggestion) => r.label && r.siren.replace(/\D/g, "").length === 9);
  } catch {
    return [];
  }
}

export function normalizeSiren(value: string): string {
  return value.replace(/\D/g, "").slice(0, 9);
}

export function normalizeSiret(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}
