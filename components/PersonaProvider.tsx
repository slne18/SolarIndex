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
  ready: boolean;
  setPersona: (persona: Persona) => void;
  clearPersona: () => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPersonaState(readStoredPersona());
    setReady(true);
  }, []);

  const setPersona = useCallback((next: Persona) => {
    writeStoredPersona(next);
    setPersonaState(next);
  }, []);

  const clearPersona = useCallback(() => {
    writeStoredPersona(null);
    setPersonaState(null);
  }, []);

  const value = useMemo(
    () => ({ persona, ready, setPersona, clearPersona }),
    [persona, ready, setPersona, clearPersona],
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
