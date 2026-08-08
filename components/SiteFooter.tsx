"use client";

import Link from "next/link";
import SolarIndexIcon from "@/components/SolarIndexIcon";
import SolarIndexWordmark from "@/components/SolarIndexWordmark";
import { useTranslations } from "@/components/LocaleProvider";
import { CONTACT_EMAIL } from "@/lib/site";

function FooterLinkList({ links }: { links: readonly { href: string; label: string }[] }) {
  return (
    <ul className="space-y-2.5 text-slate-500">
      {links.map((item) => (
        <li key={item.href + item.label}>
          <Link href={item.href} className="footer-link">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="ml-1 inline-block opacity-60"
      aria-hidden
    >
      <path d="M14 3h7v7M10 14L21 3M21 14v7H3V3h7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="shrink-0"
      aria-hidden
    >
      <path d="M4 6h16v12H4z" strokeLinejoin="round" />
      <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SiteFooter() {
  const t = useTranslations();

  const installerLinks = [
    { href: "/leads", label: t("footer.leadsDetected") },
    { href: "/appels-offres", label: t("nav.appelsOffres") },
    { href: "/#tarifs", label: t("footer.pricing") },
  ] as const;

  const ownerLinks = [
    { href: "/verifier", label: t("nav.verifyEligibility") },
    { href: "/simulateur", label: t("footer.simulator") },
    { href: "/appels-offres/nouveau", label: t("footer.depositProject") },
  ] as const;

  const navigationLinks = [
    { href: "/", label: t("footer.home") },
    { href: "/loi-aper", label: t("footer.loiAper") },
  ] as const;

  return (
    <footer className="footer-light">
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[1.2fr_1.4fr_0.9fr_0.9fr] lg:gap-8">
        <div>
          <div className="footer-brand flex items-center gap-2 font-bold">
            <SolarIndexIcon size={32} className="h-8 w-8 shrink-0" />
            <SolarIndexWordmark className="shrink-0 text-lg leading-none" />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">{t("footer.tagline")}</p>
        </div>

        <div className="text-sm">
          <div className="footer-heading text-xs font-semibold uppercase tracking-wider">{t("footer.products")}</div>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">{t("persona.installerFooter")}</div>
              <div className="mt-3">
                <FooterLinkList links={installerLinks} />
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">{t("persona.ownerFooter")}</div>
              <div className="mt-3">
                <FooterLinkList links={ownerLinks} />
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm">
          <div className="footer-heading text-xs font-semibold uppercase tracking-wider">
            {t("footer.navigation")}
          </div>
          <div className="mt-4">
            <FooterLinkList links={navigationLinks} />
          </div>
        </div>

        <div className="text-sm">
          <div className="footer-heading text-xs font-semibold uppercase tracking-wider">
            {t("footer.informations")}
          </div>
          <ul className="mt-4 space-y-2.5 text-slate-500">
            <li>
              <Link href="/legal/mentions-legales" className="footer-link inline-flex items-center">
                {t("footer.legalNotice")}
                <ExternalLinkIcon />
              </Link>
            </li>
            <li>
              <Link href="/legal/cgv" className="footer-link inline-flex items-center">
                {t("footer.cgvShort")}
                <ExternalLinkIcon />
              </Link>
            </li>
            <li>
              <Link href="/faq" className="footer-link">
                {t("footer.faq")}
              </Link>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="footer-link inline-flex items-center gap-2">
                <MailIcon />
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-copy border-t py-6 text-center text-xs">
        © {new Date().getFullYear()} SolarIndex · OpenStreetMap · Etalab · SIREN · MAJIC
      </div>
    </footer>
  );
}
