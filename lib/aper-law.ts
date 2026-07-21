/** Références réglementaires — solarisation des parkings (Loi climat + loi APER). */
export const APER_LAW_REF =
  "Loi n° 2023-175 du 10 mars 2023 (APER), art. 40 · complète l'art. L171-3 du Code de l'énergie (loi climat n° 2021-1104)";

/** Liens Legifrance (textes officiels). */
export const APER_LAW_LINKS = {
  /** Loi n° 2023-175 du 10 mars 2023 — accélération de la production d'énergies renouvelables. */
  loi2023: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047362323",
  /** Code de l'énergie, art. L171-3 (obligation de couverture solaire des parkings). */
  l171_3: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006416945",
} as const;

export const APER_SURFACE_MIN_M2 = 1_500;

export const APER_SOLAR_RATIO_LABEL = "50 %";

/** Échéances pour les parcs privés (hors concession publique) — critère : superficie en m². */
export const APER_DEADLINES = [
  {
    id: "large" as const,
    year: "2026",
    month: "Juillet",
    date: "1er juillet 2026",
    surface: "≥ 10 000 m²",
    fine: "40 000 €/an",
    targetDate: "2026-07-01",
  },
  {
    id: "small" as const,
    year: "2028",
    month: "Juillet",
    date: "1er juillet 2028",
    surface: "1 500 à 10 000 m²",
    fine: "20 000 €/an",
    targetDate: "2028-07-01",
  },
] as const;

export type AperDeadlineWave = (typeof APER_DEADLINES)[number]["id"];

export type AperWaveStatus = "passed" | "current" | "upcoming";

export function parseAperWaveTargetDate(targetDate: string): Date {
  return new Date(`${targetDate}T00:00:00+02:00`);
}

/** Statut calendrier calculé à la date du jour (prochaine vague = première échéance future). */
export function getAperWaveStatus(waveId: AperDeadlineWave, now = new Date()): AperWaveStatus {
  const sorted = [...APER_DEADLINES].sort(
    (a, b) =>
      parseAperWaveTargetDate(a.targetDate).getTime() -
      parseAperWaveTargetDate(b.targetDate).getTime(),
  );
  const nextFuture = sorted.find((w) => now < parseAperWaveTargetDate(w.targetDate));
  const wave = getAperDeadlineWave(waveId);
  const target = parseAperWaveTargetDate(wave.targetDate);

  if (now >= target) return "passed";
  if (nextFuture?.id === waveId) return "current";
  return "upcoming";
}

export function getAperDeadlineWave(id: AperDeadlineWave) {
  const wave = APER_DEADLINES.find((w) => w.id === id);
  if (!wave) throw new Error(`Unknown APER deadline wave: ${id}`);
  return wave;
}

export const APER_OBLIGATION_SUMMARY =
  "Tout parc de stationnement extérieur d'au moins 1 500 m² doit être équipé d'ombrières solaires couvrant au minimum 50 % de sa superficie (panneaux photovoltaïques sur la totalité de la partie supérieure).";

/** Parcs publics en concession : dates liées au renouvellement du contrat (voir Service Public). */
export const APER_PUBLIC_PARKS_NOTE =
  "Pour les parcs publics en concession ou délégation, le calendrier peut dépendre de la date de renouvellement du contrat de gestion.";
