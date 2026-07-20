import { describe, expect, it } from "vitest";
import { isRfpDeposant } from "@/lib/rfp-withdrawal";
import { validateRfpDeposantDeclarations } from "@/lib/rfp-legal";

describe("isRfpDeposant", () => {
  const row = {
    deposant_user_id: "user-1",
    contact_email: "gerant@parking.fr",
  };

  it("reconnaît le propriétaire par user id", () => {
    expect(isRfpDeposant(row, "user-1", "autre@email.fr")).toBe(true);
  });

  it("reconnaît le propriétaire par email de contact", () => {
    expect(isRfpDeposant({ deposant_user_id: null, contact_email: "gerant@parking.fr" }, "user-2", "gerant@parking.fr")).toBe(true);
  });

  it("refuse un tiers", () => {
    expect(isRfpDeposant(row, "user-2", "tiers@email.fr")).toBe(false);
  });
});

describe("validateRfpDeposantDeclarations", () => {
  const base = {
    est_personne_publique: false,
    acceptation_non_marche_public: true,
    acceptation_mise_en_relation: true,
    acceptation_multi_installateurs: true,
    acceptation_exactitude: true,
    acceptation_sans_garantie: true,
    acceptation_cgu_deposant: true,
    consentement_rgpd: true,
    checklist: {
      comparer_devis: true,
      qualifications: true,
      urbanisme: true,
      aper: true,
      concession: true,
    },
  };

  it("exige acceptation CGU", () => {
    const result = validateRfpDeposantDeclarations({
      ...base,
      acceptation_cgu_deposant: false,
    });
    expect(result.ok).toBe(false);
  });
});
