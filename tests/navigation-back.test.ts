import { describe, expect, it } from "vitest";
import { resolveNavBackTarget } from "@/lib/navigation-back";

describe("resolveNavBackTarget", () => {
  it("accueil et admin : pas de cible", () => {
    expect(resolveNavBackTarget("/")).toBeNull();
    expect(resolveNavBackTarget("/admin")).toBeNull();
  });

  it("FAQ et pages légales → choix profil", () => {
    expect(resolveNavBackTarget("/faq")).toEqual({ kind: "chooser" });
    expect(resolveNavBackTarget("/legal/cgu")).toEqual({ kind: "chooser" });
    expect(resolveNavBackTarget("/loi-aper")).toEqual({ kind: "chooser" });
  });

  it("outils propriétaire → hub owner", () => {
    expect(resolveNavBackTarget("/simulateur")).toEqual({ kind: "persona", persona: "owner" });
    expect(resolveNavBackTarget("/verifier")).toEqual({ kind: "persona", persona: "owner" });
    expect(resolveNavBackTarget("/appels-offres/nouveau")).toEqual({
      kind: "persona",
      persona: "owner",
    });
  });

  it("catalogue installateur → hub installer", () => {
    expect(resolveNavBackTarget("/leads")).toEqual({ kind: "persona", persona: "installer" });
    expect(resolveNavBackTarget("/appels-offres")).toEqual({ kind: "persona", persona: "installer" });
    expect(resolveNavBackTarget("/appels-offres/abc")).toEqual({
      kind: "persona",
      persona: "installer",
    });
  });
});
