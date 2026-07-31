"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePersona } from "@/components/PersonaProvider";
import { resolveNavBackTarget } from "@/lib/navigation-back";

/** Intercepte le retour navigateur pour renvoyer vers l'accueil ou le hub persona adapté. */
export default function NavBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const { setPersona, clearPersona } = usePersona();

  useEffect(() => {
    const target = resolveNavBackTarget(pathname);
    if (!target) return;

    const url = window.location.href;
    window.history.pushState({ solarindexBackTrap: true }, "", url);

    const onPopState = () => {
      if (target.kind === "chooser") {
        clearPersona();
      } else {
        setPersona(target.persona);
      }
      router.replace("/");
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [pathname, clearPersona, setPersona, router]);

  return null;
}
