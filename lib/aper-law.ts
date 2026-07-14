/** Références réglementaires — solarisation des parkings (Loi climat + loi APER). */
export const APER_LAW_REF =
  "Loi n° 2023-175 du 10 mars 2023 (APER), art. 40 · complète l'art. L171-3 du Code de l'énergie (loi climat n° 2021-1104)";

export const APER_SURFACE_MIN_M2 = 1_500;

export const APER_SOLAR_RATIO_LABEL = "50 %";

/** Échéances pour les parcs privés (hors concession publique) — critère : superficie en m². */
export const APER_DEADLINES = [
  {
    year: "2026",
    month: "Juillet",
    date: "1er juillet 2026",
    surface: "≥ 10 000 m²",
    fine: "40 000 €/an",
    status: "passed" as const,
  },
  {
    year: "2028",
    month: "Juillet",
    date: "1er juillet 2028",
    surface: "1 500 à 10 000 m²",
    fine: "20 000 €/an",
    status: "current" as const,
  },
] as const;

export const APER_OBLIGATION_SUMMARY =
  "Tout parc de stationnement extérieur d'au moins 1 500 m² doit être équipé d'ombrières solaires couvrant au minimum 50 % de sa superficie (panneaux photovoltaïques sur la totalité de la partie supérieure).";

/** Parcs publics en concession : dates liées au renouvellement du contrat (voir Service Public). */
export const APER_PUBLIC_PARKS_NOTE =
  "Pour les parcs publics en concession ou délégation, le calendrier peut dépendre de la date de renouvellement du contrat de gestion.";
