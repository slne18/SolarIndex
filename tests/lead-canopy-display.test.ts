import { describe, expect, it } from "vitest";
import {
  canopyCoverageLabel,
  isCanopyPhotoSignal,
  isHuwartCanopyLead,
  isVegetationOpportunityLead,
} from "@/lib/lead-canopy-display";

const baseUrgence = {
  flag_urgence: "URGENCE_ABSOLUE",
  vision_checked_at: "2026-01-01",
  detection: "a_verifier",
} as const;

describe("lead-canopy-display", () => {
  it("shows photo signal for vision_flag urgences", () => {
    const lead = { ...baseUrgence, vision_flag: true, vision_surface_couverte_pct: 12 };
    expect(isCanopyPhotoSignal(lead)).toBe(true);
    expect(isVegetationOpportunityLead(lead)).toBe(true);
    expect(isHuwartCanopyLead(lead)).toBe(false);
  });

  it("shows Huwart tier at 17.5% photo coverage", () => {
    const lead = { ...baseUrgence, vision_surface_couverte_pct: 17.5 };
    expect(isCanopyPhotoSignal(lead)).toBe(true);
    expect(isHuwartCanopyLead(lead)).toBe(true);
    expect(isVegetationOpportunityLead(lead)).toBe(true);
    expect(canopyCoverageLabel(lead)).toBe("18\u00a0%");
  });

  it("hides equipped parkings and non-urgences", () => {
    expect(
      isCanopyPhotoSignal({
        ...baseUrgence,
        detection: "equipe",
        vision_flag: true,
        vision_surface_couverte_pct: 30,
      }),
    ).toBe(false);
    expect(
      isCanopyPhotoSignal({
        flag_urgence: "CONFORME_REQUIS",
        vision_checked_at: "2026-01-01",
        vision_flag: true,
      }),
    ).toBe(false);
  });
});
