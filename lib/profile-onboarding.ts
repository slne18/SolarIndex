import {
  DEFAULT_PROFIL_ACHETEUR,
  isProfilAcheteur,
  type ProfilAcheteur,
} from "./profil-acheteur";

export type UserType = "installateur" | "proprietaire" | "gerant_parking";
export type ProjetDelai = "en_cours" | "six_mois" | "reflexion";

export const USER_TYPE_LABELS: Record<UserType, string> = {
  installateur: "Installateur",
  proprietaire: "Propriétaire",
  gerant_parking: "Gérant de parking",
};

export const PROJET_DELAI_LABELS: Record<ProjetDelai, string> = {
  en_cours: "Projet en cours",
  six_mois: "À 6 mois",
  reflexion: "En réflexion",
};

export interface ProfileOnboardingInput {
  user_type?: string;
  profil_acheteur?: string;
  entreprise?: string;
  entreprise_etrangere?: boolean;
  siren?: string;
  siret?: string;
  pays_entreprise?: string;
  immatriculation_etrangere?: string;
  proprietaire_raison_sociale?: string;
  proprietaire_nom?: string;
  responsable_prenom?: string;
  responsable_nom?: string;
  telephone_mobile?: string;
  telephone_bureau?: string;
  adresse_parking?: string;
  surface_m2_estimee?: number | string | null;
  projet_delai?: string | null;
  commentaire?: string;
}

export interface ProfileOnboardingPayload {
  user_type: UserType;
  profil_acheteur: ProfilAcheteur | null;
  entreprise: string | null;
  siren: string | null;
  siret: string | null;
  pays_entreprise: string | null;
  immatriculation_etrangere: string | null;
  proprietaire_raison_sociale: string | null;
  proprietaire_nom: string | null;
  responsable_prenom: string;
  responsable_nom: string;
  telephone_mobile: string;
  telephone_bureau: string | null;
  adresse_parking: string | null;
  surface_m2_estimee: number | null;
  projet_delai: ProjetDelai | null;
  commentaire: string | null;
}

function normalizeSiren(value: string): string {
  return value.replace(/\D/g, "").slice(0, 9);
}

function normalizeSiret(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseSurface(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/\s/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function isUserType(value: string): value is UserType {
  return value === "installateur" || value === "proprietaire" || value === "gerant_parking";
}

export function isProjetDelai(value: string): value is ProjetDelai {
  return value === "en_cours" || value === "six_mois" || value === "reflexion";
}

export function validateProfileOnboarding(
  input: ProfileOnboardingInput,
): { ok: true; data: ProfileOnboardingPayload } | { ok: false; error: string } {
  const userTypeRaw = clean(input.user_type);
  if (!isUserType(userTypeRaw)) {
    return { ok: false, error: "Indiquez si vous êtes installateur, propriétaire ou gérant de parking." };
  }

  let profilAcheteur: ProfilAcheteur | null = null;
  if (userTypeRaw === "installateur") {
    const rawProfil = clean(input.profil_acheteur);
    if (rawProfil && !isProfilAcheteur(rawProfil)) {
      return { ok: false, error: "Profil acheteur invalide." };
    }
    profilAcheteur = rawProfil ? rawProfil : DEFAULT_PROFIL_ACHETEUR;
  }

  const entreprise = clean(input.entreprise) || null;
  const entrepriseEtrangere = !!input.entreprise_etrangere;
  const siren = normalizeSiren(clean(input.siren));
  const siret = normalizeSiret(clean(input.siret));
  const paysEntreprise = clean(input.pays_entreprise) || null;
  const immatriculationEtrangere = clean(input.immatriculation_etrangere) || null;
  const proprietaireRaisonSociale = clean(input.proprietaire_raison_sociale) || null;
  const proprietaireNom = clean(input.proprietaire_nom) || null;
  const responsablePrenom = clean(input.responsable_prenom);
  const responsableNom = clean(input.responsable_nom);
  const telephoneMobile = clean(input.telephone_mobile);
  const telephoneBureau = clean(input.telephone_bureau) || null;
  const adresseParking = clean(input.adresse_parking) || null;
  const surfaceM2 = parseSurface(input.surface_m2_estimee);
  const projetDelaiRaw = clean(input.projet_delai);
  const projetDelai = projetDelaiRaw ? (isProjetDelai(projetDelaiRaw) ? projetDelaiRaw : null) : null;
  const commentaire = clean(input.commentaire) || null;

  if (userTypeRaw === "installateur" || userTypeRaw === "gerant_parking") {
    if (!entreprise) {
      return { ok: false, error: "La raison sociale de votre structure est requise." };
    }
    if (entrepriseEtrangere) {
      if (!paysEntreprise || !immatriculationEtrangere) {
        return {
          ok: false,
          error: "Indiquez le pays et le numéro d'immatriculation de votre société étrangère.",
        };
      }
    } else if (siren.length !== 9) {
      return {
        ok: false,
        error: "Sélectionnez votre entreprise dans les suggestions pour enregistrer le SIREN (registre SIRENE).",
      };
    }
  }

  if (userTypeRaw === "proprietaire" && entreprise && entrepriseEtrangere) {
    if (!paysEntreprise || !immatriculationEtrangere) {
      return {
        ok: false,
        error: "Indiquez le pays et le numéro d'immatriculation de votre société étrangère.",
      };
    }
  }

  if (userTypeRaw === "gerant_parking") {
    if (!proprietaireRaisonSociale && !proprietaireNom) {
      return {
        ok: false,
        error: "Indiquez la raison sociale ou le nom du propriétaire du parking.",
      };
    }
  }

  if (!responsablePrenom || !responsableNom) {
    return { ok: false, error: "Le nom et le prénom du responsable sont requis." };
  }

  if (!telephoneMobile) {
    return { ok: false, error: "Le numéro de mobile est requis." };
  }

  if (userTypeRaw === "proprietaire" || userTypeRaw === "gerant_parking") {
    if (!projetDelai) {
      return { ok: false, error: "Indiquez où en est votre projet (en cours, à 6 mois ou en réflexion)." };
    }
  }

  if (projetDelaiRaw && !projetDelai) {
    return { ok: false, error: "Horizon projet invalide." };
  }

  return {
    ok: true,
    data: {
      user_type: userTypeRaw,
      profil_acheteur: profilAcheteur,
      entreprise,
      siren: siren.length === 9 ? siren : null,
      siret: siret.length === 14 ? siret : null,
      pays_entreprise: entrepriseEtrangere ? paysEntreprise : paysEntreprise || "FR",
      immatriculation_etrangere: entrepriseEtrangere ? immatriculationEtrangere : null,
      proprietaire_raison_sociale: proprietaireRaisonSociale,
      proprietaire_nom: proprietaireNom,
      responsable_prenom: responsablePrenom,
      responsable_nom: responsableNom,
      telephone_mobile: telephoneMobile,
      telephone_bureau: telephoneBureau,
      adresse_parking: adresseParking,
      surface_m2_estimee: surfaceM2,
      projet_delai: projetDelai,
      commentaire,
    },
  };
}

export function userTypeToPersona(userType: UserType): "installer" | "owner" {
  return userType === "installateur" ? "installer" : "owner";
}

/** Dépôt de projet réservé aux propriétaires et gérants de parking. */
export function canDepositProject(userType: UserType | null | undefined): boolean {
  return userType === "proprietaire" || userType === "gerant_parking";
}

/** Achat de leads automatisés et Pack Territoire — installateurs uniquement. */
export function canPurchaseLeads(userType: UserType | null | undefined): boolean {
  return userType === "installateur";
}

/** Achat d'accès aux coordonnées d'un appel d'offres — installateurs uniquement. */
export function canPurchaseRfpAccess(userType: UserType | null | undefined): boolean {
  return userType === "installateur";
}
