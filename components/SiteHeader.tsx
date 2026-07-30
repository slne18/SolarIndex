"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderAuthNav from "@/components/HeaderAuthNav";
import HeaderSignupCta from "@/components/HeaderSignupCta";
import HeaderNavLinks from "@/components/HeaderNavLinks";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileNavMenu from "@/components/MobileNavMenu";
import SolarIndexIcon from "@/components/SolarIndexIcon";
import SolarIndexWordmark from "@/components/SolarIndexWordmark";
import { usePersona } from "@/components/PersonaProvider";

export default function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { clearPersona } = usePersona();

  function onLogoClick() {
    if (isHome) {
      clearPersona();
    }
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
          <div className="header-start-nav hidden lg:flex">
            <HeaderNavLinks variant="desktop" />
          </div>
        </div>

        <nav className="header-nav hidden lg:flex" aria-label="Compte utilisateur">
          <LanguageSwitcher />
          <HeaderAuthNav />
          <HeaderSignupCta />
        </nav>

        <MobileNavMenu />
      </div>
    </header>
  );
}
