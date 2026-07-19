"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderOwnerToolsNav from "@/components/HeaderOwnerToolsNav";
import { usePersona } from "@/components/PersonaProvider";
import { isInstallerAppelsOffresPath } from "@/lib/installer-nav";

function navLinkClass(active: boolean) {
  return `nav-link header-product-link ${active ? "text-white" : ""}`;
}

export default function HeaderProductNav() {
  const pathname = usePathname();
  const { persona, ready } = usePersona();

  if (!ready) return null;

  if (persona === "owner") {
    return (
      <nav className="header-product-nav" aria-label="Espace propriétaire">
        <HeaderOwnerToolsNav />
        <Link
          href="/appels-offres/nouveau"
          className="nav-link header-product-link text-solar min-[420px]:inline-flex"
        >
          Déposer mon projet
        </Link>
      </nav>
    );
  }

  return (
    <nav className="header-product-nav" aria-label="Produits installateur">
      <Link href="/leads" className={navLinkClass(pathname.startsWith("/leads"))}>
        Leads auto
      </Link>
      <Link
        href="/appels-offres"
        className={`${navLinkClass(isInstallerAppelsOffresPath(pathname))} hidden min-[420px]:inline-flex`}
      >
        Appels d&apos;offres
      </Link>
    </nav>
  );
}
