import { describe, it, expect } from "vitest";
import { confidenceFactors } from "@/lib/lead-confidence";

describe("lead-confidence", () => {
  it("coche verte pour recouvrement 0 % même si vision doute", () => {
    const factors = confidenceFactors({
      detection: "a_verifier",
      surface_tag_present: false,
      source_surface: "osm",
      surface_cadastrale_m2: null,
      score_confiance: 0.6,
      vision_checked_at: "2026-01-01",
      vision_flag: true,
      derogation_pente: false,
      derogation_abf: false,
      pv_overlap_pct: 0,
      pv_registry_count: null,
      vision_surface_couverte_pct: null,
      vision_ortho_date: null,
      flag_urgence: "CONFORME_REQUIS",
    });
    const equipement = factors.find((f) => f.label === "Équipement solaire");
    expect(equipement?.ok).toBe(true);
    expect(equipement?.detail).toContain("Recouvrement estimé");
    expect(equipement?.detail).not.toContain("Recouvrement OSM");
  });

  it("standard : photo aérienne mentionnée dans Équipement solaire", () => {
    const factors = confidenceFactors({
      detection: "libre",
      surface_tag_present: true,
      source_surface: "cadastre",
      surface_cadastrale_m2: 5000,
      score_confiance: 0.85,
      vision_checked_at: null,
      vision_flag: false,
      derogation_pente: false,
      derogation_abf: false,
      pv_overlap_pct: 0,
      pv_registry_count: null,
      vision_surface_couverte_pct: null,
      vision_ortho_date: null,
      flag_urgence: "CONFORME_REQUIS",
    });
    const equipement = factors.find((f) => f.label === "Équipement solaire");
    expect(equipement?.detail).toContain("Recouvrement estimé");
    expect(equipement?.detail).toContain("Photo aérienne non analysée");
    expect(equipement?.detail).toContain("réservée aux urgences");
    expect(factors.some((f) => f.label === "Photo aérienne")).toBe(false);
  });
});
