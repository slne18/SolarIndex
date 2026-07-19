export type Persona = "installer" | "owner";

export const PERSONA_STORAGE_KEY = "solarindex-persona";

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

export const PERSONA_LABELS: Record<Persona, string> = {
  installer: "Installateur",
  owner: "Propriétaire",
};

/** CTA « déposer un projet » réservés au parcours propriétaire. */
export function showOwnerProjectDeposit(persona: Persona | null): boolean {
  return persona !== "installer";
}
