import { describe, expect, it } from "vitest";
import {
  effectiveLeadScore,
  isHuwartPartialComplianceLead,
  isHuwartScorePenaltyLead,
  leadOmbriereCoveragePct,
} from "@/lib/huwart-law";

describe("huwart-law", () => {
  it("detects OSM coverage at 17.5%", () => {
    const lead = { pv_overlap_pct: 0.175, flag_urgence: "CONFORME_REQUIS" };
    expect(leadOmbriereCoveragePct(lead)).toBe(17.5);
    expect(isHuwartPartialComplianceLead(lead)).toBe(true);
  });

  it("uses vision coverage for urgences", () => {
    const lead = {
      flag_urgence: "URGENCE_ABSOLUE",
      vision_checked_at: "2026-01-01",
      vision_surface_couverte_pct: 20,
      pv_overlap_pct: 0,
    };
    expect(leadOmbriereCoveragePct(lead)).toBe(20);
    expect(isHuwartPartialComplianceLead(lead)).toBe(true);
  });

  it("ignores urgences without vision", () => {
    const lead = { flag_urgence: "URGENCE_ABSOLUE", pv_overlap_pct: 0.3 };
    expect(isHuwartPartialComplianceLead(lead)).toBe(false);
  });

  it("applies score penalty only below equipped threshold", () => {
    const penalized = {
      score_confiance: 0.85,
      pv_overlap_pct: 0.2,
      detection: "a_verifier",
      flag_urgence: "CONFORME_REQUIS",
    };
    expect(isHuwartScorePenaltyLead(penalized)).toBe(true);
    expect(effectiveLeadScore(penalized)).toBe(0.8);

    const equipped = {
      score_confiance: 0.85,
      pv_overlap_pct: 0.55,
      detection: "equipe",
      flag_urgence: "CONFORME_REQUIS",
    };
    expect(isHuwartScorePenaltyLead(equipped)).toBe(false);
    expect(effectiveLeadScore(equipped)).toBe(0.85);
  });
});
