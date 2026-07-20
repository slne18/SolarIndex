import { describe, expect, it } from "vitest";
import { validateRfpOfficialFields } from "@/lib/rfp-official-fields";
import { isKnownOfficialPlatform, normalizeOfficialUrl } from "@/lib/rfp-official";

describe("normalizeOfficialUrl", () => {
  it("accepte une URL PLACE", () => {
    const url = normalizeOfficialUrl("https://marches-publics.gouv.fr/?page=Entreprise");
    expect(url).toContain("marches-publics.gouv.fr");
    expect(isKnownOfficialPlatform(url!)).toBe(true);
  });
});

describe("validateRfpOfficialFields", () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const futureStr = future.toISOString().slice(0, 10);

  it("accepte un dépôt sans AO officiel", () => {
    const result = validateRfpOfficialFields({ ao_publie_officiellement: false });
    expect(result.ok).toBe(true);
  });

  it("exige lien et date si AO officiel", () => {
    const result = validateRfpOfficialFields({ ao_publie_officiellement: true });
    expect(result.ok).toBe(false);
  });

  it("accepte AO officiel complet", () => {
    const result = validateRfpOfficialFields({
      ao_publie_officiellement: true,
      lien_consultation_officielle: "https://marches-publics.gouv.fr/app.php/entreprise/",
      date_limite_offres: futureStr,
      nombre_places: 320,
      parking_deja_etudie: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.nombre_places).toBe(320);
      expect(result.data.parking_deja_etudie).toBe(true);
    }
  });
});
