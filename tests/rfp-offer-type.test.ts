import { describe, expect, it } from "vitest";
import { validateRfpOfferInput } from "@/lib/rfp-offer-type";
import { validateProfileOnboarding } from "@/lib/profile-onboarding";

describe("rfp-offer-type", () => {
  it("accepts devis without duration", () => {
    const r = validateRfpOfferInput({ type_offre: "devis_installation" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.type_offre).toBe("devis_installation");
      expect(r.duree_contrat_ans).toBeNull();
    }
  });

  it("requires duration for tiers-investissement", () => {
    expect(validateRfpOfferInput({ type_offre: "tiers_investissement" }).ok).toBe(false);
    const r = validateRfpOfferInput({ type_offre: "tiers_investissement", duree_contrat_ans: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.duree_contrat_ans).toBe(20);
  });
});

describe("profil_acheteur onboarding", () => {
  const base = {
    user_type: "installateur",
    entreprise: "Test SAS",
    siren: "123456789",
    responsable_prenom: "Jean",
    responsable_nom: "Dupont",
    telephone_mobile: "0600000000",
  };

  it("defaults profil_acheteur to installateur", () => {
    const r = validateProfileOnboarding(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.profil_acheteur).toBe("installateur");
  });

  it("stores tiers_investisseur when selected", () => {
    const r = validateProfileOnboarding({ ...base, profil_acheteur: "tiers_investisseur" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.profil_acheteur).toBe("tiers_investisseur");
  });

  it("ignores profil_acheteur for owners", () => {
    const r = validateProfileOnboarding({
      ...base,
      user_type: "proprietaire",
      entreprise: "",
      siren: "",
      projet_delai: "six_mois",
      profil_acheteur: "tiers_investisseur",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.profil_acheteur).toBeNull();
  });
});
