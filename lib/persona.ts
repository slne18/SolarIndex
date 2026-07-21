export type Persona = "installer" | "owner";

export const PERSONA_STORAGE_KEY = "solarindex-persona";
/** Choix explicite installateur / propriétaire sur l'accueil (session navigateur). */
export const PERSONA_SESSION_PICK_KEY = "solarindex-session-pick";

export function isPersona(value: unknown): value is Persona {
  return value === "installer" || value === "owner";
}

export function readStoredPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    return isPersona(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredPersona(persona: Persona | null): void {
  if (typeof window === "undefined") return;
  try {
    if (persona === null) {
      window.localStorage.removeItem(PERSONA_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PERSONA_STORAGE_KEY, persona);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function readSessionPersonaPick(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(PERSONA_SESSION_PICK_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSessionPersonaPick(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      window.sessionStorage.setItem(PERSONA_SESSION_PICK_KEY, "1");
    } else {
      window.sessionStorage.removeItem(PERSONA_SESSION_PICK_KEY);
    }
  } catch {
    /* ignore */
  }
}

export const PERSONA_LABELS: Record<Persona, string> = {
  installer: "Installateur",
  owner: "Propriétaire",
};

/** CTA « déposer un projet » réservés au parcours propriétaire. */
export function showOwnerProjectDeposit(persona: Persona | null): boolean {
  return persona !== "installer";
}
