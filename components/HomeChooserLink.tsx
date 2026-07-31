"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePersona } from "@/components/PersonaProvider";

/** Lien accueil principal — réinitialise le choix installateur / propriétaire. */
export default function HomeChooserLink({
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const { clearPersona } = usePersona();

  return (
    <Link
      {...props}
      onClick={(e) => {
        clearPersona();
        onClick?.(e);
      }}
    />
  );
}
