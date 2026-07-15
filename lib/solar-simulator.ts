import { APER_SOLAR_RATIO_LABEL } from "./aper-law";
import { formatAperAnnualFine, maxAperAnnualFineEur } from "./aper-fine";
import { ALL_REGIONS } from "./seo-zones";
import { SURFACE_APER_MIN_M2 } from "./surface-thresholds";

/** Aligné sur solarindex_pipeline.py */
export const SOLAR_RATIO = 0.5;
export const M2_PAR_KWC = 5;
export const COUT_KWC_EUR = 1_200;

/** Tarif électricité professionnelle indicatif (€/kWh TTC). */
export const ELECTRICITY_PRICE_EUR = 0.18;

/** Part autoconsommée par défaut (éclairage, bornes, locaux) si conso non renseignée. */
export const DEFAULT_AUTOCONSUMPTION_RATIO = 0.55;

/**
 * Tarifs EDF OA indicatifs (arrêté S21, c€/kWh → €/kWh).
 * Tranches simplifiées pour ombrières parking.
 */
export function edfOaTariffEurPerKwh(puissanceKwc: number): number {
  if (puissanceKwc <= 100) return 0.0912;
  if (puissanceKwc <= 500) return 0.0886;
  return 0.076;
}

/** Plafond horaire rémunération EDF OA (tranche 100–500 kWc). */
export const EDF_OA_CAP_HOURS = 1100;
export const EDF_OA_BEYOND_CAP_EUR = 0.04;

/** Productivité spécifique moyenne (kWh/kWc/an) par région — source PVGIS / moyennes FR. */
export const REGION_YIELD_KWH_PER_KWC: Record<string, number> = {
  "Provence-Alpes-Côte d'Azur": 1380,
  Occitanie: 1340,
  "Auvergne-Rhône-Alpes": 1220,
  "Nouvelle-Aquitaine": 1260,
  Bretagne: 1080,
  "Hauts-de-France": 980,
  "Grand Est": 1080,
  Normandie: 1050,
  "Centre-Val de Loire": 1180,
  "Bourgogne-Franche-Comté": 1120,
  "Pays de la Loire": 1160,
  "Île-de-France": 1100,
  Corse: 1400,
  Guadeloupe: 1500,
  Martinique: 1480,
  Guyane: 1420,
  "La Réunion": 1450,
  Mayotte: 1460,
};

export const SIMULATOR_REGIONS = ALL_REGIONS.filter((r) => REGION_YIELD_KWH_PER_KWC[r] != null);

export type SurfaceInput =
  | { mode: "direct"; surfaceM2: number }
  | { mode: "dimensions"; lengthM: number; widthM: number };

export function resolveSurfaceM2(input: SurfaceInput): number {
  if (input.mode === "direct") return Math.max(0, input.surfaceM2);
  return Math.max(0, input.lengthM * input.widthM);
}

export type SimulatorInput = {
  surface: SurfaceInput;
  region: string;
  consumptionKwhPerYear?: number | null;
};

export type SimulatorResult = {
  surfaceM2: number;
  surfaceSolaireM2: number;
  puissanceKwc: number;
  yieldKwhPerKwc: number;
  productionKwhPerYear: number;
  selfConsumedKwh: number;
  surplusKwh: number;
  autoconsommationSavingsEur: number;
  surplusRevenueEur: number;
  autoconsommationTotalEur: number;
  edfOaFullInjectionEur: number;
  edfOaTariff: number;
  fineAvoidedEur: number;
  installationCostEur: number;
  roiYearsAutoconsommation: number | null;
  roiYearsFullInjection: number | null;
  aperEligible: boolean;
  solarRatioLabel: string;
};

function edfOaRevenue(productionKwh: number, puissanceKwc: number): number {
  const tariff = edfOaTariffEurPerKwh(puissanceKwc);
  if (puissanceKwc > 100 && puissanceKwc <= 500) {
    const capKwh = puissanceKwc * EDF_OA_CAP_HOURS;
    const atTariff = Math.min(productionKwh, capKwh);
    const beyond = Math.max(0, productionKwh - capKwh);
    return atTariff * tariff + beyond * EDF_OA_BEYOND_CAP_EUR;
  }
  const capKwh = puissanceKwc * 1600;
  const atTariff = Math.min(productionKwh, capKwh);
  const beyond = Math.max(0, productionKwh - capKwh);
  return atTariff * tariff + beyond * EDF_OA_BEYOND_CAP_EUR;
}

export function runParkingSolarSimulator(input: SimulatorInput): SimulatorResult {
  const surfaceM2 = Math.round(resolveSurfaceM2(input.surface));
  const surfaceSolaireM2 = Math.round(surfaceM2 * SOLAR_RATIO);
  const puissanceKwc = Math.max(1, Math.round(surfaceSolaireM2 / M2_PAR_KWC));
  const yieldKwhPerKwc =
    REGION_YIELD_KWH_PER_KWC[input.region] ?? REGION_YIELD_KWH_PER_KWC["Île-de-France"]!;
  const productionKwhPerYear = Math.round(puissanceKwc * yieldKwhPerKwc);

  const consumption = input.consumptionKwhPerYear;
  const selfConsumedKwh =
    consumption != null && consumption > 0
      ? Math.min(productionKwhPerYear, Math.round(consumption))
      : Math.round(productionKwhPerYear * DEFAULT_AUTOCONSUMPTION_RATIO);
  const surplusKwh = Math.max(0, productionKwhPerYear - selfConsumedKwh);

  const autoconsommationSavingsEur = Math.round(selfConsumedKwh * ELECTRICITY_PRICE_EUR);
  const surplusTariff = edfOaTariffEurPerKwh(puissanceKwc);
  const surplusRevenueEur = Math.round(surplusKwh * surplusTariff);
  const autoconsommationTotalEur = autoconsommationSavingsEur + surplusRevenueEur;

  const edfOaFullInjectionEur = Math.round(edfOaRevenue(productionKwhPerYear, puissanceKwc));
  const installationCostEur = puissanceKwc * COUT_KWC_EUR;
  const fineAvoidedEur = surfaceM2 >= SURFACE_APER_MIN_M2 ? maxAperAnnualFineEur(surfaceM2) : 0;

  const roiYearsAutoconsommation =
    autoconsommationTotalEur > 0
      ? Math.round((installationCostEur / autoconsommationTotalEur) * 10) / 10
      : null;
  const roiYearsFullInjection =
    edfOaFullInjectionEur > 0
      ? Math.round((installationCostEur / edfOaFullInjectionEur) * 10) / 10
      : null;

  return {
    surfaceM2,
    surfaceSolaireM2,
    puissanceKwc,
    yieldKwhPerKwc,
    productionKwhPerYear,
    selfConsumedKwh,
    surplusKwh,
    autoconsommationSavingsEur,
    surplusRevenueEur,
    autoconsommationTotalEur,
    edfOaFullInjectionEur,
    edfOaTariff: surplusTariff,
    fineAvoidedEur,
    installationCostEur,
    roiYearsAutoconsommation,
    roiYearsFullInjection,
    aperEligible: surfaceM2 >= SURFACE_APER_MIN_M2,
    solarRatioLabel: APER_SOLAR_RATIO_LABEL,
  };
}

export { formatAperAnnualFine };
