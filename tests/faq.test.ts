import { describe, it, expect } from "vitest";
import { validateFaqAnswer, validateFaqEmail, validateFaqQuestion } from "@/lib/faq-db";

describe("faq-db validation", () => {
  it("exige une question d'au moins 10 caractères", () => {
    expect(validateFaqQuestion("court")).toMatch(/10/);
    expect(validateFaqQuestion("  Question valide ?  ")).toBeNull();
  });

  it("exige une réponse d'au moins 10 caractères", () => {
    expect(validateFaqAnswer("ok")).toMatch(/10/);
    expect(validateFaqAnswer("Voici la réponse complète.")).toBeNull();
  });

  it("exige une adresse email valide", () => {
    expect(validateFaqEmail("")).toMatch(/requise/i);
    expect(validateFaqEmail("   ")).toMatch(/requise/i);
    expect(validateFaqEmail("pas-un-email")).toMatch(/invalide/i);
    expect(validateFaqEmail("  Contact@Example.com  ")).toBeNull();
  });
});
