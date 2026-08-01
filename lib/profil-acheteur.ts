export type ProfilAcheteur = "installateur" | "tiers_investisseur";

export const PROFIL_ACHETEUR_LABELS: Record<ProfilAcheteur, string> = {
  installateur: "Installateur / EPC",
  tiers_investisseur: "Tiers-investisseur (loyer / PPA)",
};

export const DEFAULT_PROFIL_ACHETEUR: ProfilAcheteur = "installateur";

export function isProfilAcheteur(value: string): value is ProfilAcheteur {
  return value === "installateur" || value === "tiers_investisseur";
}

export function parseProfilAcheteur(value: unknown): ProfilAcheteur | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return isProfilAcheteur(raw) ? raw : null;
}
