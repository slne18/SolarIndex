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
      adresse_parking: "1 rue Test",
      surface_m2_estimee: 2000,
      projet_delai: "six_mois",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/propriétaire/i);
  });

  it("accepte un propriétaire avec parking et horizon projet", () => {
    const result = validateProfileOnboarding({
      user_type: "proprietaire",
      ...baseContact,
      adresse_parking: "12 av. de la Gare, Bordeaux",
      surface_m2_estimee: "3 500",
      projet_delai: "reflexion",
      commentaire: "Parking couvert",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.surface_m2_estimee).toBe(3500);
      expect(result.data.commentaire).toBe("Parking couvert");
    }
  });
});
