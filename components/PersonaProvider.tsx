"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Persona,
  readSessionPersonaPick,
  readStoredPersona,
  writeSessionPersonaPick,
  writeStoredPersona,
} from "@/lib/persona";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { isUserType, userTypeToPersona } from "@/lib/profile-onboarding";

interface PersonaContextValue {
  persona: Persona | null;
  /** Profil choisi explicitement lors de la visite en cours (hero accueil). */
  sessionPick: boolean;
  ready: boolean;
  setPersona: (persona: Persona) => void;
  clearPersona: () => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona | null>(null);
  const [sessionPick, setSessionPick] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPersonaState(readStoredPersona());
    setSessionPick(readSessionPersonaPick());
    setReady(true);
  }, []);

  /** Profil complété = source de vérité (évite un persona « propriétaire » obsolète en localStorage). */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => ({}));
        const userType = data.profile?.user_type;
        if (data.profile_completed && isUserType(userType)) {
          const synced = userTypeToPersona(userType);
          writeStoredPersona(synced);
          setPersonaState(synced);
        }
      } catch {
        /* ignore — visiteur ou session expirée */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const setPersona = useCallback((next: Persona) => {
    writeStoredPersona(next);
    writeSessionPersonaPick(true);
    setPersonaState(next);
    setSessionPick(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  const clearPersona = useCallback(() => {
    writeStoredPersona(null);
    writeSessionPersonaPick(false);
    setPersonaState(null);
    setSessionPick(false);
  }, []);

  const value = useMemo(
    () => ({ persona, sessionPick, ready, setPersona, clearPersona }),
    [persona, sessionPick, ready, setPersona, clearPersona],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return ctx;
}
