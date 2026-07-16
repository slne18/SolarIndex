import { describe, expect, it } from "vitest";
import { leadCompleteness } from "@/lib/lead-completeness";

describe("leadCompleteness", () => {
  it("detects dirigeant and high completeness", () => {
    const r = leadCompleteness({
      siren: "123456789",
      raison_sociale: "ACME",
      id_parcelle: "3300100AB0123",
      adresse: "1 rue Test",
      code_naf: "47.11F",
      dirigeant_exploitant: "M. Dupont",
      dirigeant_nom: null,
      proprietaire_foncier: "SCI Test",
      dirigeant_proprietaire: "Mme Martin",
      source_surface: "cadastre",
      detection: "libre",
      surface_tag_present: true,
    });
    expect(r.hasDirigeant).toBe(true);
    expect(r.pct).toBeGreaterThanOrEqual(85);
  });

  it("flags missing dirigeant", () => {
    const r = leadCompleteness({
      siren: "123456789",
      raison_sociale: "ACME",
      id_parcelle: "3300100AB0123",
      adresse: "1 rue Test",
      code_naf: null,
      dirigeant_exploitant: null,
      dirigeant_nom: null,
      proprietaire_foncier: null,
      dirigeant_proprietaire: null,
      source_surface: "osm",
      detection: "libre",
      surface_tag_present: false,
    });
    expect(r.hasDirigeant).toBe(false);
    expect(r.pct).toBeLessThan(70);
  });
});
