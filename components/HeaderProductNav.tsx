"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersona } from "@/components/PersonaProvider";

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
        <Link
          href="/verifier"
          className={navLinkClass(pathname.startsWith("/verifier"))}
        >
          Éligibilité
        </Link>
        <Link
          href="/simulateur"
          className={`${navLinkClass(pathname.startsWith("/simulateur"))} hidden min-[420px]:inline-flex`}
        >
          Gains
        </Link>
        <Link
          href="/appels-offres/nouveau"
          className="nav-link header-product-link hidden text-solar min-[520px]:inline-flex"
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
        className={`${navLinkClass(pathname.startsWith("/appels-offres"))} hidden min-[420px]:inline-flex`}
      >
        Appels d&apos;offres
      </Link>
      <Link
        href="/territoire"
        className={`${navLinkClass(pathname.startsWith("/territoire"))} hidden min-[520px]:inline-flex`}
      >
        Leads dans ma zone
      </Link>
    </nav>
  );
}
