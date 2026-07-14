import { describe, it, expect } from "vitest";
import {
  computeFlagUrgence,
  isInGrayLowBand,
  isInUrgenceGrayBand,
  isSurfaceSellable,
} from "@/lib/surface-thresholds";
import { isLeadSellable as isLeadSellableRow } from "@/lib/leads";
import type { LeadRow } from "@/lib/types";

describe("surface-thresholds", () => {
  it("zone grise basse 1500–1600 non vendable", () => {
    expect(isInGrayLowBand(1500)).toBe(true);
    expect(isInGrayLowBand(1600)).toBe(true);
    expect(isInGrayLowBand(1601)).toBe(false);
    expect(isSurfaceSellable(1550)).toBe(false);
    expect(isSurfaceSellable(1601)).toBe(true);
  });

  it("zone grise urgence 10000–11000", () => {
    expect(isInUrgenceGrayBand(10_000)).toBe(true);
    expect(isInUrgenceGrayBand(11_000)).toBe(true);
    expect(isInUrgenceGrayBand(11_001)).toBe(false);
    expect(computeFlagUrgence(10_500)).toBe("CONFORME_REQUIS");
    expect(computeFlagUrgence(11_100)).toBe("URGENCE_ABSOLUE");
  });
});

describe("isLeadSellable avec surface", () => {
  const base: Pick<
    LeadRow,
    | "adresse"
    | "detection"
    | "siren"
    | "id_parcelle"
    | "surface_m2"
    | "vision_surface_couverte_pct"
  > = {
    adresse: "1 rue X",
    detection: "libre",
    siren: "123",
    id_parcelle: "p1",
    surface_m2: 5000,
    vision_surface_couverte_pct: null,
  };

  it("refuse la zone 1500–1600", () => {
    expect(isLeadSellableRow({ ...base, surface_m2: 1550 })).toBe(false);
    expect(isLeadSellableRow({ ...base, surface_m2: 1700 })).toBe(true);
  });

  it("refuse photo > 45 % de couverture", () => {
    expect(isLeadSellableRow({ ...base, vision_surface_couverte_pct: 52 })).toBe(false);
    expect(isLeadSellableRow({ ...base, vision_surface_couverte_pct: 45 })).toBe(true);
  });
});
