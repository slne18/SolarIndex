"use client";

import Link from "next/link";
import MobileNavMenu from "@/components/MobileNavMenu";
import SolarIndexIcon from "@/components/SolarIndexIcon";
import SolarIndexWordmark from "@/components/SolarIndexWordmark";
import { usePersona } from "@/components/PersonaProvider";

export default function SiteHeader() {
  const { clearPersona } = usePersona();

  function onLogoClick() {
    clearPersona();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <header className="site-header">
      <div className="header-bar">
        <div className="header-start">
          <Link href="/" className="header-brand group" onClick={onLogoClick}>
            <SolarIndexIcon
              size={44}
              className="h-10 w-10 shrink-0 shadow-glow transition group-hover:scale-[1.02] sm:h-11 sm:w-11"
            />
            <SolarIndexWordmark className="header-brand-text" />
          </Link>
        </div>

        <MobileNavMenu />
      </div>
    </header>
  );
}
