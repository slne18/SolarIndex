import { isInstallerAppelsOffresPath } from "./installer-nav";
import type { Persona } from "./persona";

export type NavBackTarget =
  | { kind: "chooser" }
  | { kind: "persona"; persona: Persona };

/** Cible du retour navigateur (sémantique) selon la page courante. */
export function resolveNavBackTarget(pathname: string): NavBackTarget | null {
  if (!pathname || pathname === "/" || pathname.startsWith("/admin")) return null;

  if (
    pathname.startsWith("/legal") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/loi-aper") ||
    pathname === "/login" ||
    pathname.startsWith("/auth/")
  ) {
    return { kind: "chooser" };
  }

  if (
    pathname.startsWith("/verifier") ||
    pathname.startsWith("/simulateur") ||
    pathname.startsWith("/appels-offres/nouveau") ||
    pathname.includes("/modifier")
  ) {
    return { kind: "persona", persona: "owner" };
  }

  if (
    pathname.startsWith("/leads") ||
    isInstallerAppelsOffresPath(pathname) ||
    pathname.startsWith("/territoire") ||
    pathname.startsWith("/pack-territoire") ||
    pathname.startsWith("/checkout")
  ) {
    return { kind: "persona", persona: "installer" };
  }

  return { kind: "chooser" };
}
