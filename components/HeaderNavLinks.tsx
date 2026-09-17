"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import { isInstallerAppelsOffresPath } from "@/lib/installer-nav";
import type { Persona } from "@/lib/persona";

type HeaderNavLinksProps = {
  onNavigate?: () => void;
};

export default function HeaderNavLinks({ onNavigate }: HeaderNavLinksProps) {
  const pathname = usePathname();
  const { ready, setPersona } = usePersona();
  const t = useTranslations();

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

  const installerLinks = [
    { href: "/leads", label: t("footer.leadsDetected"), active: pathname.startsWith("/leads") },
    {
      href: "/appels-offres",
      label: t("nav.appelsOffres"),
      active: isInstallerAppelsOffresPath(pathname),
    },
    { href: "/#tarifs", label: t("footer.pricing"), active: false },
  ] as const;

  const ownerLinks = [
    { href: "/verifier", label: t("nav.verifyEligibility"), active: pathname.startsWith("/verifier") },
    { href: "/simulateur", label: t("footer.simulator"), active: pathname.startsWith("/simulateur") },
    {
      href: "/appels-offres/nouveau",
      label: t("nav.deposerProjet"),
      active: pathname.startsWith("/appels-offres/nouveau"),
    },
  ] as const;

  return (
    <div className="mobile-nav-sections">
      <div className="mobile-nav-section">
        <p className="mobile-nav-section-label">{t("persona.installerFooter")}</p>
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

      <div className="mobile-nav-section">
        <p className="mobile-nav-section-label">{t("persona.ownerFooter")}</p>
        <div className="mobile-nav-links">
          {ownerLinks.map((item) => (
            <Link
              key={item.href}
              {...drawerLinkProps(item.href, item.active, drawerLink(item.active), "owner")}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
