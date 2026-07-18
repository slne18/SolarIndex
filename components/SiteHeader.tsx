"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderAuthNav from "@/components/HeaderAuthNav";
import HeaderSignupCta from "@/components/HeaderSignupCta";
import HeaderProductNav from "@/components/HeaderProductNav";
import PersonaSwitcher from "@/components/PersonaSwitcher";
import SolarIndexIcon from "@/components/SolarIndexIcon";
import { usePersona } from "@/components/PersonaProvider";

export default function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { clearPersona } = usePersona();

  function goHome() {
    clearPersona();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <header className="site-header">
      <div className="header-bar">
        <div className="header-start">
          <Link href="/" className="header-brand group" onClick={goHome}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-solar to-solar-600 text-night shadow-glow transition group-hover:scale-[1.02] sm:h-11 sm:w-11">
              <SolarIndexIcon size={20} className="sm:h-[22px] sm:w-[22px]" />
            </span>
            <span className="header-brand-text whitespace-nowrap">
              Solar<span className="text-solar">Index</span>
            </span>
          </Link>
          {isHome ? (
            <PersonaSwitcher compact className="persona-switcher-left" />
          ) : (
            <HeaderProductNav />
          )}
        </div>
        <nav className="header-nav" aria-label="Compte utilisateur">
          {!isHome ? <PersonaSwitcher compact /> : null}
          <HeaderAuthNav />
          <HeaderSignupCta />
        </nav>
      </div>
    </header>
  );
}
