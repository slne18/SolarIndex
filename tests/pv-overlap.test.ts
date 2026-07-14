import { describe, it, expect } from "vitest";
import {
  displayRecouvrementSourceLine,
  displayRecouvrementSummary,
  formatPvOverlapPct,
  formatVisionCoveragePct,
  formatVisionOrthoDate,
  isVisionEquippedPct,
  leadCoverageSummary,
  pvOverlapSummary,
  visionCoverageSummary,
  visionRecouvrementSummary,
  VISION_COVERAGE_EQUIPE,
} from "@/lib/pv-overlap";

describe("pv-overlap", () => {
  it("formate les pourcentages OSM en français", () => {
    expect(formatPvOverlapPct(0)).toBe("0\u00a0%");
    expect(formatPvOverlapPct(0.032)).toBe("3,2\u00a0%");
    expect(formatPvOverlapPct(0.5)).toBe("50\u00a0%");
    expect(formatPvOverlapPct(null)).toBeNull();
  });

  it("formate les pourcentages vision (0–100)", () => {
    expect(formatVisionCoveragePct(45.2)).toBe("45\u00a0%");
    expect(formatVisionCoveragePct(0)).toBe("0\u00a0%");
  });

  it("résume libre / a_verifier / non analysé", () => {
    expect(pvOverlapSummary({ pv_overlap_pct: 0, detection: "libre" }).short).toBe("0\u00a0%");
    expect(pvOverlapSummary({ pv_overlap_pct: 0, detection: "libre" }).detail).toContain(
      "Recouvrement estimé",
    );
    expect(pvOverlapSummary({ pv_overlap_pct: 0.12, detection: "a_verifier" }).short).toBe("12\u00a0%");
    expect(pvOverlapSummary({ pv_overlap_pct: null, detection: "libre" }).short).toBe("Non analysé");
  });

  it("formate la date orthophoto", () => {
    expect(formatVisionOrthoDate("2024-05-10")).toMatch(/2024/);
    expect(formatVisionOrthoDate(null)).toBeNull();
  });

  it("résume vision quand analysée", () => {
    const v = visionCoverageSummary({
      vision_checked_at: "2026-01-01",
      vision_surface_couverte_pct: 35,
      vision_ortho_date: "2024-05-10",
      vision_flag: true,
    });
    expect(v?.short).toBe("35\u00a0%");
    expect(v?.detail).toContain("orthophoto");
  });

  it("seuil photo équipé à 45 %", () => {
    expect(VISION_COVERAGE_EQUIPE).toBe(45);
    expect(isVisionEquippedPct(45)).toBe(false);
    expect(isVisionEquippedPct(45.1)).toBe(true);
    const v = visionCoverageSummary({
      vision_checked_at: "2026-01-01",
      vision_surface_couverte_pct: 52,
      vision_flag: true,
    });
    expect(v?.detail).toContain("équipé");
    expect(v?.detail).toContain("hors vente");
  });

  it("leadCoverageSummary combine OSM et photo", () => {
    const c = leadCoverageSummary({
      pv_overlap_pct: 0.02,
      detection: "libre",
      vision_checked_at: "2026-01-01",
      vision_surface_couverte_pct: 10,
      vision_flag: false,
    });
    expect(c.osm.short).toBe("2,0\u00a0%");
    expect(c.vision?.short).toBe("10\u00a0%");
  });

  it("urgences : recouvrement affiché depuis la photo", () => {
    const lead = {
      flag_urgence: "URGENCE_ABSOLUE",
      pv_overlap_pct: 0,
      detection: "libre",
      vision_checked_at: "2026-01-01",
      vision_surface_couverte_pct: 35,
      vision_flag: true,
      vision_ortho_date: "2024-05-10",
    };
    expect(displayRecouvrementSummary(lead).short).toBe("35\u00a0%");
    expect(displayRecouvrementSummary(lead).detail).toContain("Recouvrement estimé");
    expect(displayRecouvrementSummary(lead).detail).toContain("Orthophoto");
    expect(displayRecouvrementSourceLine(lead)).toContain("photo aérienne");
    expect(visionRecouvrementSummary(lead).detail).not.toContain("OpenStreetMap");
  });

  it("conforme requis : recouvrement OSM", () => {
    const lead = {
      flag_urgence: "CONFORME_REQUIS",
      pv_overlap_pct: 0.12,
      detection: "a_verifier",
    };
    expect(displayRecouvrementSummary(lead).short).toBe("12\u00a0%");
    expect(displayRecouvrementSourceLine(lead)).toContain("OpenStreetMap");
  });
});
