"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderOwnerToolsNav from "@/components/HeaderOwnerToolsNav";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import { isInstallerAppelsOffresPath } from "@/lib/installer-nav";

function navLinkClass(active: boolean) {
  return `nav-link header-product-link ${active ? "text-white" : ""}`;
}

export default function HeaderProductNav() {
  const pathname = usePathname();
  const { persona, ready } = usePersona();
  const t = useTranslations();

  if (!ready) return null;

  if (persona === "owner") {
    return (
      <nav className="header-product-nav" aria-label={t("persona.owner")}>
        <HeaderOwnerToolsNav />
        <Link
          href="/appels-offres/nouveau"
          className="btn-mint shrink-0 !px-3.5 !py-2 text-xs sm:text-sm min-[420px]:inline-flex"
        >
          {t("nav.deposerProjet")}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="header-product-nav" aria-label={t("persona.installer")}>
      <Link href="/leads" className={navLinkClass(pathname.startsWith("/leads"))}>
        {t("nav.leadsAuto")}
      </Link>
      <Link
        href="/appels-offres"
        className={`${navLinkClass(isInstallerAppelsOffresPath(pathname))} hidden min-[420px]:inline-flex`}
      >
        {t("nav.appelsOffres")}
      </Link>
    </nav>
  );
}
