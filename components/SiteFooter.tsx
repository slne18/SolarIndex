"use client";

import Link from "next/link";
import SolarIndexIcon from "@/components/SolarIndexIcon";
import { PERSONA_LABELS } from "@/lib/persona";
import { usePersona } from "@/components/PersonaProvider";

const INSTALLER_LINKS = [
  { href: "/leads", label: "Leads détectés" },
  { href: "/appels-offres", label: "Appels d'offres" },
  { href: "/#tarifs", label: "Tarifs" },
] as const;

const OWNER_LINKS = [
  { href: "/verifier", label: "Vérifier éligibilité" },
  { href: "/simulateur", label: "Gains & économies parking" },
  { href: "/appels-offres/nouveau", label: "Déposer mon projet" },
] as const;

function FooterLinkList({
  links,
  light,
}: {
  links: readonly { href: string; label: string }[];
  light: boolean;
}) {
  const linkClass = light ? "footer-link" : "transition hover:text-white";

  return (
    <ul className="space-y-2.5 text-slate-500">
      {links.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={linkClass}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SiteFooter({ light = false }: { light?: boolean }) {
  const { persona, ready } = usePersona();
  const showBoth = !ready || persona === null;
  const headingClass = light ? "footer-heading font-semibold" : "font-semibold text-slate-200";
  const subheadingClass = light
    ? "footer-heading text-xs font-semibold uppercase tracking-wider"
    : "text-xs font-semibold uppercase tracking-wider text-slate-400";

  return (
    <footer className={light ? "footer-light" : "mt-20 border-t border-white/[0.08]"}>
      <div className="container-x grid gap-10 py-14 sm:grid-cols-3">
        <div>
          <div className={`flex items-center gap-2 font-bold ${light ? "footer-brand" : "text-white"}`}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-solar/90 text-night">
              <SolarIndexIcon size={14} />
            </span>
            Solar<span className="text-solar">Index</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
            {persona === "owner"
              ? "Vérifiez votre obligation APER, estimez vos gains et recevez des propositions d'installateurs."
              : "Leads APER pour installateurs · éligibilité, gains estimés et propositions d'installateurs pour propriétaires et gérants de parking."}
          </p>
        </div>

        <div className="text-sm">
          <div className={headingClass}>Produits</div>
          {showBoth ? (
            <div className="mt-4 space-y-6">
              <div>
                <div className={subheadingClass}>{PERSONA_LABELS.installer}</div>
                <div className="mt-3">
                  <FooterLinkList links={INSTALLER_LINKS} light={light} />
                </div>
              </div>
              <div>
                <div className={subheadingClass}>{PERSONA_LABELS.owner}</div>
                <div className="mt-3">
                  <FooterLinkList links={OWNER_LINKS} light={light} />
                </div>
              </div>
            </div>
          ) : persona === "owner" ? (
            <div className="mt-4">
              <FooterLinkList links={OWNER_LINKS} light={light} />
            </div>
          ) : (
            <div className="mt-4">
              <FooterLinkList links={INSTALLER_LINKS} light={light} />
            </div>
          )}
        </div>

        <div className="text-sm">
          <div className={headingClass}>Légal</div>
          <ul className="mt-4 space-y-2.5 text-slate-500">
            <li>
              <Link href="/legal/confidentialite" className={light ? "footer-link" : "transition hover:text-white"}>
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/legal/mentions-legales" className={light ? "footer-link" : "transition hover:text-white"}>
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/legal/cgu" className={light ? "footer-link" : "transition hover:text-white"}>
                CGU (déposants)
              </Link>
            </li>
            <li>
              <Link href="/legal/cgv" className={light ? "footer-link" : "transition hover:text-white"}>
                CGV (installateurs)
              </Link>
            </li>
            <li>
              <Link href="/faq" className={light ? "footer-link" : "transition hover:text-white"}>
                FAQ
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div
        className={`py-6 text-center text-xs ${light ? "footer-copy border-t" : "border-t border-white/[0.06] text-slate-600"}`}
      >
        © {new Date().getFullYear()} SolarIndex · OpenStreetMap · Etalab · SIREN · MAJIC
      </div>
    </footer>
  );
}
