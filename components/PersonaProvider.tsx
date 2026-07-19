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
  readStoredPersona,
  writeStoredPersona,
} from "@/lib/persona";

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
    setReady(true);
  }, []);

  const setPersona = useCallback((next: Persona) => {
    writeStoredPersona(next);
    setPersonaState(next);
    setSessionPick(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  const clearPersona = useCallback(() => {
    writeStoredPersona(null);
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
