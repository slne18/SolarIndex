import { describe, expect, it } from "vitest";
import { validateProfileOnboarding } from "@/lib/profile-onboarding";

const baseContact = {
  responsable_prenom: "Marie",
  responsable_nom: "Durand",
  telephone_mobile: "0612345678",
};

describe("validateProfileOnboarding", () => {
  it("accepte un installateur avec SIREN valide", () => {
    const result = validateProfileOnboarding({
      user_type: "installateur",
      entreprise: "Solar Pro SAS",
      siren: "732829320",
      siret: "73282932000012",
      ...baseContact,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user_type).toBe("installateur");
      expect(result.data.siren).toBe("732829320");
      expect(result.data.adresse_parking).toBeNull();
    }
  });

  it("exige le SIREN pour une société française", () => {
    const result = validateProfileOnboarding({
      user_type: "installateur",
      entreprise: "Solar Pro SAS",
      ...baseContact,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/SIREN/i);
  });

  it("accepte une société étrangère avec immatriculation", () => {
    const result = validateProfileOnboarding({
      user_type: "installateur",
      entreprise: "Solar GmbH",
      entreprise_etrangere: true,
      pays_entreprise: "DE",
      immatriculation_etrangere: "HRB 123456",
      ...baseContact,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.siren).toBeNull();
      expect(result.data.immatriculation_etrangere).toBe("HRB 123456");
    }
  });

  it("exige propriétaire ou raison sociale pour un gérant", () => {
    const result = validateProfileOnboarding({
      user_type: "gerant_parking",
      entreprise: "Parking Services",
      siren: "732829320",
      ...baseContact,
      projet_delai: "six_mois",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/propriétaire/i);
  });

  it("accepte un gérant avec horizon projet sans adresse parking", () => {
    const result = validateProfileOnboarding({
      user_type: "gerant_parking",
      entreprise: "Parking Services",
      siren: "732829320",
      proprietaire_nom: "Dupont",
      ...baseContact,
      projet_delai: "six_mois",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.adresse_parking).toBeNull();
      expect(result.data.surface_m2_estimee).toBeNull();
    }
  });

  it("accepte un propriétaire avec horizon projet uniquement", () => {
    const result = validateProfileOnboarding({
      user_type: "proprietaire",
      ...baseContact,
      projet_delai: "reflexion",
      commentaire: "Parking couvert",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.surface_m2_estimee).toBeNull();
      expect(result.data.commentaire).toBe("Parking couvert");
    }
  });

  it("exige l'horizon projet pour un propriétaire", () => {
    const result = validateProfileOnboarding({
      user_type: "proprietaire",
      ...baseContact,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/horizon|projet/i);
  });
});
