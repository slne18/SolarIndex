import { describe, it, expect } from "vitest";
import {
  computeRfpAccessPrice,
  PRIX_RFP,
  RFP_SURFACE_TIER_M2,
  toPublicRfp,
} from "@/lib/rfp";
import type { RfpSubmissionRow } from "@/lib/rfp";

function makeRfp(overrides: Partial<RfpSubmissionRow> = {}): RfpSubmissionRow {
  return {
    id: "rfp-1",
    created_at: "2026-01-01T00:00:00Z",
    statut: "publie",
    entreprise: "Test SAS",
    siret: null,
    siret_verifie: false,
    contact_nom: "M. Test",
    contact_fonction: null,
    contact_email: "test@example.com",
    contact_telephone: "0102030405",
    email_verifie: true,
    adresse: "1 rue Test, 33000 Bordeaux",
    latitude: null,
    longitude: null,
    departement: "33",
    region: "Nouvelle-Aquitaine",
    surface_estimee_m2: 5000,
    deja_equipe_partiel: false,
    derogation_pente: false,
    derogation_abf: false,
    budget_indicatif: null,
    delai_souhaite: null,
    notes_particulieres: null,
    photos_urls: null,
    consentement_rgpd: true,
    acheteurs_count: 0,
    acheteurs_max: 5,
    ...overrides,
  };
}

describe("computeRfpAccessPrice", () => {
  it("400 € sous 10 000 m²", () => {
    expect(computeRfpAccessPrice(1500)).toBe(PRIX_RFP.sous_10000);
    expect(computeRfpAccessPrice(9999)).toBe(PRIX_RFP.sous_10000);
    expect(computeRfpAccessPrice(null)).toBe(PRIX_RFP.sous_10000);
  });

  it("550 € à partir de 10 000 m²", () => {
    expect(computeRfpAccessPrice(RFP_SURFACE_TIER_M2)).toBe(PRIX_RFP.a_partir_10000);
    expect(computeRfpAccessPrice(25000)).toBe(PRIX_RFP.a_partir_10000);
  });

  it("toPublicRfp expose le prix calculé", () => {
    expect(toPublicRfp(makeRfp({ surface_estimee_m2: 8000 })).prix_acces).toBe(400);
    expect(toPublicRfp(makeRfp({ surface_estimee_m2: 12000 })).prix_acces).toBe(550);
  });
});
