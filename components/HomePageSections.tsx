"use client";

import Link from "next/link";
import { PRIX_LEAD } from "@/lib/leads";
import {
  TERRITOIRE_LEADS_QUOTA,
  TERRITOIRE_PACK_DISCOUNT_PCT,
  TERRITOIRE_PACK_EUR,
} from "@/lib/subscription";
import { PRIX_RFP, RFP_SURFACE_TIER_M2 } from "@/lib/rfp";
import {
  APER_DEADLINES,
  APER_LAW_REF,
  APER_OBLIGATION_SUMMARY,
  APER_PUBLIC_PARKS_NOTE,
} from "@/lib/aper-law";
import SectionEyebrow from "@/components/SectionEyebrow";
import RegulatoryCountdown from "@/components/RegulatoryCountdown";
import { usePersona } from "@/components/PersonaProvider";

export default function HomePageSections() {
  const { persona, sessionPick, ready } = usePersona();
  const showChooser = !ready || persona === null || !sessionPick;
  const showInstaller = ready && sessionPick && persona === "installer";

  return (
    <div className="surface-light">
      <LoiAperSection />

      {showInstaller ? <InstallerTarifsSections /> : null}

      {showChooser ? <HomeSignupCta /> : null}
    </div>
  );
}

function LoiAperSection() {
  return (
    <section id="loi-aper" className="py-14 sm:py-20">
      <div className="container-x">
        <SectionEyebrow>La loi APER</SectionEyebrow>
        <h2 className="section-title mt-3">Une obligation légale qui crée des chantiers</h2>
        <p className="section-lead mt-4">{APER_OBLIGATION_SUMMARY}</p>
        <p className="mt-3 text-xs text-slate-500">{APER_LAW_REF}</p>

        <div className="card mt-10 overflow-hidden">
          <div className="card-header border-b px-6 py-4 sm:px-8">
            <h3 className="font-semibold text-slate-900">Calendrier de mise en conformité</h3>
            <p className="mt-1 text-sm text-slate-500">
              Parcs privés · seuil selon la superficie du parking
            </p>
          </div>
          <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-8">
            {APER_DEADLINES.map((step) => (
              <RegulatoryCountdown key={step.id} variant="timeline" wave={step.id} />
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">{APER_PUBLIC_PARKS_NOTE}</p>
      </div>
    </section>
  );
}

function InstallerTarifsSections() {
  const premiumHref = "/leads?tier=premium";

  return (
    <>
      <section id="tarifs" className="py-14 sm:py-20">
        <div className="container-x">
          <SectionEyebrow>Tarifs</SectionEyebrow>
          <h2 className="section-title mt-3">Leads automatisés</h2>
          <p className="section-lead">
            Deux niveaux selon la qualité des signaux Open Data. Vous achetez un{" "}
            <strong>lead de prospection</strong>, jamais un chantier garanti.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PriceCard
              title="Lead Standard"
              price={`${PRIX_LEAD.standard} €`}
              features={[
                "Indice de confiance modéré (< 0,80)",
                "Surface parking parfois à confirmer sur site",
                "Contacts entreprise inclus",
                "100 € — même tarif quelle que soit la surface",
              ]}
              cta="Parcourir"
              href="/leads"
            />
            <PriceCard
              title="Lead Premium"
              price={`${PRIX_LEAD.premium} €`}
              features={[
                "Indice de confiance élevé (≥ 0,80)",
                "Peu de vérifications nécessaires",
                "Parking sans panneaux repérés",
                "Revêtement et surface cadastrale confirmés",
                "~10 % du catalogue",
              ]}
              cta="Filtrer Premium"
              href={premiumHref}
              popular
            />
            <PriceCard
              title="Pack Territoire"
              price={`${TERRITOIRE_PACK_EUR} €`}
              discountBadge={`−${TERRITOIRE_PACK_DISCOUNT_PCT} %`}
              features={[
                `${TERRITOIRE_LEADS_QUOTA} leads — achat unique`,
                "Standard ou Premium : vous choisissez",
                "Crédit instantané · France entière",
              ]}
              cta="Acheter le pack"
              href="/pack-territoire"
            />
          </div>
        </div>
      </section>

      <section id="tarifs-appels-offres" className="border-t border-slate-200/80 py-14 sm:py-20">
        <div className="container-x">
          <SectionEyebrow>Consultation installateurs</SectionEyebrow>
          <h2 className="section-title mt-3">Projets déposés par les gérants</h2>
          <p className="section-lead">
            Coordonnées partagées gratuitement par des gérants privés — mise en relation commerciale,
            hors marché public.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <PriceCard
              title={`Parking < ${nfSurface(RFP_SURFACE_TIER_M2)} m²`}
              price={`${PRIX_RFP.sous_10000} €`}
              features={[
                "Accès aux coordonnées du gérant",
                "Surface estimée inférieure à 10 000 m²",
                "Budget et délai indicatifs inclus",
                "Paiement unique par accès projet",
              ]}
              cta="Voir les projets déposés"
              href="/appels-offres"
            />
            <PriceCard
              title={`Parking ≥ ${nfSurface(RFP_SURFACE_TIER_M2)} m²`}
              price={`${PRIX_RFP.a_partir_10000} €`}
              features={[
                "Accès aux coordonnées du gérant",
                "Grands parkings et zones commerciales",
                "Projets à plus forte valeur chantier",
                "Paiement unique par accès projet",
              ]}
              cta="Voir les projets déposés"
              href="/appels-offres?surface_min=10000"
              popular
            />
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Détails juridiques :{" "}
            <Link href="/legal/cgv#rfp-deposants" className="text-solar-600 hover:underline">
              CGV §6 — dépôts de projets
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

function HomeSignupCta() {
  return (
    <section className="container-x py-16 sm:py-24">
      <div className="card mx-auto max-w-3xl px-8 py-12 text-center sm:px-12">
        <h2 className="cta-card-title text-2xl font-bold tracking-tight sm:text-3xl">
          L&apos;échéance APER approche.
        </h2>
        <p className="cta-card-lead mx-auto mt-4 max-w-lg text-base leading-relaxed">
          Des milliers de parkings à équiper : un flux de chantiers régulier, capté avant vos
          concurrents.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/login?mode=signup&next=/" className="btn-solar min-w-[14rem]">
            Créer un compte
          </Link>
        </div>
      </div>
    </section>
  );
}

function nfSurface(n: number): string {
  return n.toLocaleString("fr-FR");
}

function PriceCard({
  title,
  price,
  features,
  cta,
  href,
  popular = false,
  discountBadge,
}: {
  title: string;
  price: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
  discountBadge?: string;
}) {
  return (
    <div className={`card-interactive relative flex flex-col p-6 ${popular ? "ring-1 ring-solar/30" : ""}`}>
      {discountBadge ? (
        <span className="absolute right-4 top-4 rounded-full bg-solar/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night">
          {discountBadge}
        </span>
      ) : null}
      {popular ? (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-solar px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night">
          Populaire
        </span>
      ) : null}
      <div className={`price-card-title text-sm font-medium ${discountBadge ? "pr-16" : ""}`}>{title}</div>
      <div className="price-card-price mt-2 text-2xl font-bold">{price}</div>
      <ul className="price-card-features mt-5 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-solar">✓</span>
            <span className="min-w-0 flex-1">{f}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className={`mt-6 w-full ${popular ? "btn-solar" : "btn-ghost"}`}>
        {cta}
      </Link>
    </div>
  );
}
