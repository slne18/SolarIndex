const API_RECHERCHE = "https://recherche-entreprises.api.gouv.fr/search";

export interface SiretLookupResult {
  ok: boolean;
  siret: string;
  siren: string;
  entreprise: string;
  error?: string;
}

export async function verifySiret(siretRaw: string): Promise<SiretLookupResult> {
  const siret = siretRaw.replace(/\s/g, "");
  if (!/^\d{14}$/.test(siret)) {
    return { ok: false, siret, siren: "", entreprise: "", error: "SIRET invalide (14 chiffres)." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${API_RECHERCHE}?q=${encodeURIComponent(siret)}&page=1&per_page=5`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, siret, siren: "", entreprise: "", error: "API SIREN indisponible." };
    }
    const json = await res.json();
    const results = json.results ?? [];
    const match = results.find(
      (r: { siege?: { siret?: string }; matching_etablissements?: { siret: string }[] }) =>
        r.siege?.siret === siret ||
        r.matching_etablissements?.some((e: { siret: string }) => e.siret === siret),
    );
    if (!match) {
      return { ok: false, siret, siren: "", entreprise: "", error: "SIRET introuvable dans SIREN." };
    }
    const siren = String(match.siren ?? siret.slice(0, 9));
    const entreprise =
      match.nom_complet || match.nom_raison_sociale || match.denomination || "";
    return { ok: true, siret, siren, entreprise };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      siret,
      siren: "",
      entreprise: "",
      error: timedOut ? "Vérification SIRET trop lente — réessayez." : "Erreur réseau SIREN.",
    };
  }
}
