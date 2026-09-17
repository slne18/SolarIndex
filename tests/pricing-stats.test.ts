import { describe, it, expect } from "vitest";
import { PREMIUM_LEAD_MAX_AGE_MS, PRIX_PLATEFORME_MENSUEL } from "@/lib/platform-access";
import { PRIX_LEAD } from "@/lib/leads";

describe("platform pricing constants", () => {
  it("plateforme à 300 €/mois", () => {
    expect(PRIX_PLATEFORME_MENSUEL).toBe(300);
  });

  it("lead premium à 99 €", () => {
    expect(PRIX_LEAD.premium).toBe(99);
  });

  it("fenêtre premium ~6 mois", () => {
    expect(PREMIUM_LEAD_MAX_AGE_MS).toBeGreaterThan(180 * 24 * 60 * 60 * 1000);
    expect(PREMIUM_LEAD_MAX_AGE_MS).toBeLessThan(184 * 24 * 60 * 60 * 1000);
  });
});
