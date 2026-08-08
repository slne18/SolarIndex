"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePersona } from "@/components/PersonaProvider";

/** Accueil avec parcours propriétaire / gérant présélectionné. */
export default function OwnerPersonaHomeLink({
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const { setPersona } = usePersona();

  return (
    <Link
      {...props}
      onClick={(e) => {
        setPersona("owner");
        if (typeof window !== "undefined" && window.location.pathname === "/") {
          e.preventDefault();
        }
        onClick?.(e);
      }}
    />
  );
}
