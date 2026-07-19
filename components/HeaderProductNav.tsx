"use client";

import Link from "next/link";
import HeaderOwnerToolsNav from "@/components/HeaderOwnerToolsNav";
import HeaderInstallerChantiersNav from "@/components/HeaderInstallerChantiersNav";
import { usePersona } from "@/components/PersonaProvider";

export default function HeaderProductNav() {
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
      <HeaderInstallerChantiersNav />
    </nav>
  );
}
