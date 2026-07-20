import { runParkingSolarSimulator } from "./solar-simulator";

export type RfpSolarEstimate = {
  puissance_kwc: number;
  production_kwh_an: number;
  ca_autoconsommation_eur: number;
  ca_injection_edf_oa_eur: number;
  valeur_chantier_eur: number;
  aper_eligible: boolean;
};

export function estimateRfpSolarMetrics(
  surfaceM2: number | null | undefined,
  region: string | null | undefined,
): RfpSolarEstimate | null {
  const surface = Number(surfaceM2);
  if (!Number.isFinite(surface) || surface <= 0) return null;

  const sim = runParkingSolarSimulator({
    surface: { mode: "direct", surfaceM2: surface },
    region: region?.trim() || "Île-de-France",
  });

  return {
    puissance_kwc: sim.puissanceKwc,
    production_kwh_an: sim.productionKwhPerYear,
    ca_autoconsommation_eur: sim.autoconsommationTotalEur,
    ca_injection_edf_oa_eur: sim.edfOaFullInjectionEur,
    valeur_chantier_eur: sim.installationCostEur,
    aper_eligible: sim.aperEligible,
  };
}
