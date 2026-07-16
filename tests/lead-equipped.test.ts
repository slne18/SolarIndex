import { describe, expect, it } from "vitest";
import { isConsidereCommeEquipeLead } from "@/lib/lead-equipped";

describe("isConsidereCommeEquipeLead", () => {
  const enriched = { siren: "123456789", id_parcelle: "3300100AB0123" };

  it("detects pipeline equipe", () => {
    expect(isConsidereCommeEquipeLead({ detection: "equipe", ...enriched })).toBe(true);
  });

  it("detects OSM overlap ≥ 50 %", () => {
    expect(
      isConsidereCommeEquipeLead({ detection: "libre", pv_overlap_pct: 0.52, ...enriched }),
    ).toBe(true);
  });

  it("detects large parking with vision > 45 %", () => {
    expect(
      isConsidereCommeEquipeLead({
        detection: "libre",
        surface_m2: 12_000,
        vision_surface_couverte_pct: 46,
        ...enriched,
      }),
    ).toBe(true);
  });

  it("ignores vision > 45 % under 10 000 m²", () => {
    expect(
      isConsidereCommeEquipeLead({
        detection: "libre",
        surface_m2: 5_000,
        vision_surface_couverte_pct: 60,
        siren: "123456789",
        id_parcelle: "3300100AB0123",
      }),
    ).toBe(false);
  });

  it("includes missing SIREN or parcelle", () => {
    expect(
      isConsidereCommeEquipeLead({
        detection: "libre",
        surface_m2: 5_000,
        siren: null,
        id_parcelle: "3300100AB0123",
      }),
    ).toBe(true);
    expect(
      isConsidereCommeEquipeLead({
        detection: "libre",
        surface_m2: 5_000,
        siren: "123456789",
        id_parcelle: null,
      }),
    ).toBe(true);
  });

  it("includes gray zone 1 500–1 600 m²", () => {
    expect(
      isConsidereCommeEquipeLead({
        detection: "libre",
        surface_m2: 1_550,
        siren: "123456789",
        id_parcelle: "3300100AB0123",
      }),
    ).toBe(true);
  });
});
