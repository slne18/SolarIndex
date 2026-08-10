"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import OwnerPersonaLabel from "@/components/OwnerPersonaLabel";
import { isInstallerAppelsOffresPath } from "@/lib/installer-nav";
import type { Persona } from "@/lib/persona";

type HeaderNavLinksProps = {
  variant: "desktop" | "drawer";
  onNavigate?: () => void;
};

function desktopLinkClass(active: boolean) {
  return `nav-link header-product-link ${active ? "header-product-link-active" : ""}`;
}

export default function HeaderNavLinks({ variant, onNavigate }: HeaderNavLinksProps) {
  const pathname = usePathname();
  const { persona, ready, setPersona } = usePersona();
  const t = useTranslations();

  const isHome = pathname === "/";

  if (!ready) return null;

  const drawerLink = (active: boolean) =>
    `mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`;

  const drawerLinkProps = (
    href: string,
    active: boolean,
    className: string,
    personaPick: Persona,
  ) => ({
    href,
    className,
    onClick: () => {
      setPersona(personaPick);
      onNavigate?.();
    },
    "aria-current": active ? ("page" as const) : undefined,
  });

  if (variant === "drawer") {
    const installerLinks = [
      { href: "/leads", label: t("nav.leadsAuto"), active: pathname.startsWith("/leads") },
      {
        href: "/appels-offres",
        label: t("nav.appelsOffres"),
        active: isInstallerAppelsOffresPath(pathname),
      },
    ] as const;

    const ownerLinks = [
      { href: "/verifier", label: t("nav.verifyEligibility"), active: pathname.startsWith("/verifier") },
      { href: "/simulateur", label: t("footer.simulator"), active: pathname.startsWith("/simulateur") },
    ] as const;

    return (
      <>
        {!isHome ? (
          <div className="mobile-nav-section">
            <p className="mobile-nav-section-label">{t("persona.installer")}</p>
            <div className="mobile-nav-links">
              {installerLinks.map((item) => (
                <Link
                  key={item.href}
                  {...drawerLinkProps(item.href, item.active, drawerLink(item.active), "installer")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mobile-nav-section">
          <OwnerPersonaLabel
            variant="nav"
            subtitleKey="home.ownerCardSubtitle"
            className="mobile-nav-section-label mb-3 block"
          />
          <div className="mobile-nav-links">
            {ownerLinks.map((item) => (
              <Link
                key={item.href}
                {...drawerLinkProps(item.href, item.active, drawerLink(item.active), "owner")}
              >
                {item.label}
              </Link>
            ))}
            <Link
              {...drawerLinkProps(
                "/appels-offres/nouveau",
                pathname.startsWith("/appels-offres/nouveau"),
                "btn-mint mobile-nav-cta",
                "owner",
              )}
            >
              {t("nav.deposerProjet")}
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (persona === "owner") {
    return (
      <nav className="header-product-nav" aria-label={t("persona.owner")}>
        <div className="header-tools group relative">
          <button
            type="button"
            className={`nav-link header-product-link flex items-center gap-1 ${
              pathname.startsWith("/verifier") || pathname.startsWith("/simulateur")
                ? "header-product-link-active"
                : ""
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
            <div className="header-tools-dropdown">
              <Link
                href="/verifier"
                className={`header-tools-dropdown-link ${
                  pathname.startsWith("/verifier") ? "header-tools-dropdown-link-active" : ""
                }`}
              >
                {t("nav.verifyEligibility")}
              </Link>
              <Link
                href="/simulateur"
                className={`header-tools-dropdown-link ${
                  pathname.startsWith("/simulateur") ? "header-tools-dropdown-link-active" : ""
                }`}
              >
                {t("footer.simulator")}
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

  if (isHome) return null;

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
