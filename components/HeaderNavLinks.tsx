"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import OwnerPersonaLabel from "@/components/OwnerPersonaLabel";
import { isInstallerAppelsOffresPath } from "@/lib/installer-nav";

type HeaderNavLinksProps = {
  variant: "desktop" | "drawer";
  onNavigate?: () => void;
};

function desktopLinkClass(active: boolean) {
  return `nav-link header-product-link ${active ? "text-white" : ""}`;
}

export default function HeaderNavLinks({ variant, onNavigate }: HeaderNavLinksProps) {
  const pathname = usePathname();
  const { persona, ready } = usePersona();
  const t = useTranslations();

  if (!ready) return null;

  const drawerLink = (active: boolean) =>
    `mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`;

  const linkProps = (href: string, active: boolean, className: string) => ({
    href,
    className,
    onClick: onNavigate,
    "aria-current": active ? ("page" as const) : undefined,
  });

  if (variant === "drawer") {
    if (persona === "owner") {
      const ownerTools = [
        { href: "/verifier", label: t("nav.verifyEligibility") },
        { href: "/simulateur", label: t("nav.simulatorGains") },
      ] as const;

      return (
        <div className="mobile-nav-section">
          <OwnerPersonaLabel variant="nav" className="mobile-nav-section-label mb-3 block" />
          <div className="mobile-nav-links">
            {ownerTools.map((tool) => (
              <Link
                key={tool.href}
                {...linkProps(tool.href, pathname.startsWith(tool.href), drawerLink(pathname.startsWith(tool.href)))}
              >
                {tool.label}
              </Link>
            ))}
            <Link
              {...linkProps(
                "/appels-offres/nouveau",
                pathname.startsWith("/appels-offres/nouveau"),
                "btn-mint mobile-nav-cta",
              )}
            >
              {t("nav.deposerProjet")}
            </Link>
          </div>
        </div>
      );
    }

    if (persona === "installer") {
      return (
        <div className="mobile-nav-section">
          <p className="mobile-nav-section-label">{t("persona.installer")}</p>
          <div className="mobile-nav-links">
            <Link
              {...linkProps("/leads", pathname.startsWith("/leads"), drawerLink(pathname.startsWith("/leads")))}
            >
              {t("nav.leadsAuto")}
            </Link>
            <Link
              {...linkProps(
                "/appels-offres",
                isInstallerAppelsOffresPath(pathname),
                drawerLink(isInstallerAppelsOffresPath(pathname)),
              )}
            >
              {t("nav.appelsOffres")}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="mobile-nav-section">
        <p className="mobile-nav-section-label">{t("nav.explore")}</p>
        <div className="mobile-nav-links">
          <Link {...linkProps("/leads", pathname.startsWith("/leads"), drawerLink(pathname.startsWith("/leads")))}>
            {t("nav.leadsAuto")}
          </Link>
          <Link
            {...linkProps(
              "/appels-offres",
              isInstallerAppelsOffresPath(pathname),
              drawerLink(isInstallerAppelsOffresPath(pathname)),
            )}
          >
            {t("nav.appelsOffres")}
          </Link>
          <Link {...linkProps("/verifier", pathname.startsWith("/verifier"), drawerLink(pathname.startsWith("/verifier")))}>
            {t("nav.verifyEligibility")}
          </Link>
          <Link
            {...linkProps("/simulateur", pathname.startsWith("/simulateur"), drawerLink(pathname.startsWith("/simulateur")))}
          >
            {t("nav.simulatorGains")}
          </Link>
          <Link
            {...linkProps(
              "/appels-offres/nouveau",
              pathname.startsWith("/appels-offres/nouveau"),
              "btn-mint mobile-nav-cta",
            )}
          >
            {t("nav.deposerProjet")}
          </Link>
        </div>
      </div>
    );
  }

  if (persona === "owner") {
    return (
      <nav className="header-product-nav" aria-label={t("persona.owner")}>
        <div className="header-tools group relative">
          <button
            type="button"
            className={`nav-link header-product-link flex items-center gap-1 ${
              pathname.startsWith("/verifier") || pathname.startsWith("/simulateur") ? "text-white" : ""
            }`}
            aria-haspopup="true"
            aria-expanded="false"
          >
            {t("nav.tools")}
            <svg
              className="h-3.5 w-3.5 opacity-60 transition group-hover:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="header-tools-menu pointer-events-none absolute left-0 top-full z-50 min-w-[15rem] pt-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <div className="rounded-xl border border-white/10 bg-night-900 py-1.5 shadow-xl">
              <Link
                href="/verifier"
                className={`block px-4 py-2.5 text-sm transition hover:bg-white/[0.06] hover:text-white ${
                  pathname.startsWith("/verifier") ? "text-solar" : "text-slate-300"
                }`}
              >
                {t("nav.verifyEligibility")}
              </Link>
              <Link
                href="/simulateur"
                className={`block px-4 py-2.5 text-sm transition hover:bg-white/[0.06] hover:text-white ${
                  pathname.startsWith("/simulateur") ? "text-solar" : "text-slate-300"
                }`}
              >
                {t("nav.simulatorGains")}
              </Link>
            </div>
          </div>
        </div>
        <Link href="/appels-offres/nouveau" className="btn-mint shrink-0 !px-3.5 !py-2 text-xs sm:text-sm">
          {t("nav.deposerProjet")}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="header-product-nav" aria-label={t("persona.installer")}>
      <Link href="/leads" className={desktopLinkClass(pathname.startsWith("/leads"))}>
        {t("nav.leadsAuto")}
      </Link>
      <Link href="/appels-offres" className={desktopLinkClass(isInstallerAppelsOffresPath(pathname))}>
        {t("nav.appelsOffres")}
      </Link>
    </nav>
  );
}
