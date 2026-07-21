"use client";

import { useTranslations } from "@/components/LocaleProvider";
import OwnerPersonaLabel from "@/components/OwnerPersonaLabel";
import { usePersona } from "@/components/PersonaProvider";
import type { Persona } from "@/lib/persona";

const OPTIONS: Persona[] = ["installer", "owner"];

export default function PersonaSwitcher({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { persona, ready, setPersona } = usePersona();
  const t = useTranslations();

  if (!ready) {
    return <div className="persona-switcher persona-switcher-skeleton" aria-hidden />;
  }

  return (
    <div
      className={`persona-switcher ${className}`.trim()}
      role="group"
      aria-label={t("persona.chooseProfile")}
    >
      {OPTIONS.map((option) => {
        const active = persona === option;
        const label = compact
          ? t(option === "installer" ? "persona.installerShort" : "persona.ownerShort")
          : t(option === "installer" ? "persona.installer" : "persona.owner");
        return (
          <button
            key={option}
            type="button"
            className={`persona-switcher-btn ${active ? "persona-switcher-btn-active" : ""}`}
            aria-pressed={active}
            onClick={() => setPersona(option)}
          >
            {option === "owner" ? (
              <OwnerPersonaLabel variant="switcher" />
            ) : (
              label
            )}
          </button>
        );
      })}
    </div>
  );
}
