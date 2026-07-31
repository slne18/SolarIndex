import { describe, expect, it } from "vitest";
import {
  resolveSurfaceM2,
  runParkingSolarSimulator,
  edfOaTariffEurPerKwh,
} from "@/lib/solar-simulator";

describe("solar-simulator", () => {
  it("resolves dimensions to surface", () => {
    expect(
      resolveSurfaceM2({ mode: "dimensions", lengthM: 100, widthM: 50 }),
    ).toBe(5000);
  });

  it("computes APER solar surface at 50%", () => {
    const r = runParkingSolarSimulator({
      surface: { mode: "direct", surfaceM2: 4000 },
      region: "Occitanie",
    });
    expect(r.surfaceSolaireM2).toBe(2000);
    expect(r.puissanceKwc).toBe(400);
    expect(r.productionKwhPerYear).toBeGreaterThan(400_000);
  });

  it("uses consumption when provided", () => {
    const r = runParkingSolarSimulator({
      surface: { mode: "direct", surfaceM2: 3000 },
      region: "Île-de-France",
      consumptionKwhPerYear: 50_000,
    });
    expect(r.selfConsumedKwh).toBeLessThanOrEqual(50_000);
  });

  it("returns fine for large parking", () => {
    const r = runParkingSolarSimulator({
      surface: { mode: "direct", surfaceM2: 12_000 },
      region: "Occitanie",
    });
    expect(r.fineAvoidedEur).toBe(40_000);
  });

  it("edf tariff tiers", () => {
    expect(edfOaTariffEurPerKwh(50)).toBe(0.0912);
    expect(edfOaTariffEurPerKwh(200)).toBe(0.0886);
  });

  it("mix mode at 17.5% PV on 5000 m²", () => {
    const r = runParkingSolarSimulator({
      surface: { mode: "direct", surfaceM2: 5000 },
      region: "Occitanie",
      solutionMode: "mixte_pv_vegetal",
      pvShareOfTotalSurface: 0.175,
    });
    expect(r.surfaceSolaireM2).toBe(875);
    expect(r.surfaceVegetaliseeM2).toBe(1625);
    expect(r.puissanceKwc).toBe(175);
    expect(r.installationCostPvEur).toBe(175 * 1200);
    expect(r.installationCostVegetationEur).toBe(1625 * 150);
    expect(r.installationCostEur).toBe(175 * 1200 + 1625 * 150);
    expect(r.opexEurPerYear).toBe(175 * 12);
  });

  it("net gain and ROI exclude APER fine and include OPEX", () => {
    const r = runParkingSolarSimulator({
      surface: { mode: "direct", surfaceM2: 5000 },
      region: "Occitanie",
    });
    expect(r.autoconsommationSavingsEur).toBe(66_330);
    expect(r.surplusRevenueEur).toBe(26_713);
    expect(r.opexEurPerYear).toBe(6_000);
    expect(r.netOperatingBenefitEur).toBe(87_043);
    expect(r.roiYearsNet).toBe(6.9);
    expect(r.fineAvoidedEur).toBe(20_000);
  });

  it("pv_pur mode unchanged vs 50% solar surface", () => {
    const r = runParkingSolarSimulator({
      surface: { mode: "direct", surfaceM2: 4000 },
      region: "Occitanie",
      solutionMode: "pv_pur",
    });
    expect(r.surfaceSolaireM2).toBe(2000);
    expect(r.surfaceVegetaliseeM2).toBe(0);
    expect(r.installationCostVegetationEur).toBe(0);
  });
});
