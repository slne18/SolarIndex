"use client";

import { PERSONA_LABELS, type Persona } from "@/lib/persona";
import { usePersona } from "@/components/PersonaProvider";

const OPTIONS: Persona[] = ["installer", "owner"];

export default function PersonaSwitcher({ compact = false }: { compact?: boolean }) {
  const { persona, ready, setPersona } = usePersona();

  if (!ready) {
    return (
      <div
        className="persona-switcher persona-switcher-skeleton"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="persona-switcher"
      role="group"
      aria-label="Choisir votre profil"
    >
      {OPTIONS.map((option) => {
        const active = persona === option;
        const short = option === "installer" ? "Installateur" : "Propriétaire";
        return (
          <button
            key={option}
            type="button"
            className={`persona-switcher-btn ${active ? "persona-switcher-btn-active" : ""}`}
            aria-pressed={active}
            onClick={() => setPersona(option)}
          >
            {compact ? short : PERSONA_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
