import { describe, it, expect } from "vitest";
import {
  canRedeemLeadWithPack,
  canRedeemLeadWithPackFromQuota,
} from "@/lib/pack-premium-limits";

const anyLead = {
  detection: "libre" as const,
  surface_tag_present: true,
  source_surface: "cadastre" as const,
  score_confiance: 0.9,
  adresse: "1 rue X",
  siren: "123456789",
  id_parcelle: "ABC",
  surface_m2: 15000,
};

describe("pack territoire — sans limite Premium/Standard", () => {
  it("autorise tout lead tant que le pack a des crédits", () => {
    expect(canRedeemLeadWithPack(anyLead, null)).toBe(true);
    expect(canRedeemLeadWithPackFromQuota(anyLead, null)).toBe(true);
  });
});
