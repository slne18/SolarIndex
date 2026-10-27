import { describe, it, expect } from "vitest";
import {
  PREMIUM_LEAD_MAX_AGE_MS,
  PRIX_PLATEFORME_MENSUEL,
  PRIX_PLATEFORME_PREMIER_MOIS,
} from "@/lib/platform-access";
import { PRIX_LEAD } from "@/lib/leads";

describe("platform pricing constants", () => {
  it("plateforme à 300 €/mois", () => {
    expect(PRIX_PLATEFORME_MENSUEL).toBe(300);
  });

  it("1er mois à −20 % (240 €)", () => {
    expect(PRIX_PLATEFORME_PREMIER_MOIS).toBe(240);
  });

  it("lead premium à 50 €", () => {
    expect(PRIX_LEAD.premium).toBe(50);
  });

  it("fenêtre premium ~6 mois", () => {
    expect(PREMIUM_LEAD_MAX_AGE_MS).toBeGreaterThan(180 * 24 * 60 * 60 * 1000);
    expect(PREMIUM_LEAD_MAX_AGE_MS).toBeLessThan(184 * 24 * 60 * 60 * 1000);
  });
});
