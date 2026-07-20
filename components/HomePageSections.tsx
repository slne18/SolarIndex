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
import HomeFeaturedNewsBanner from "@/components/HomeFeaturedNewsBanner";
import { usePersona } from "@/components/PersonaProvider";

export default function HomePageSections() {
  const { persona, sessionPick, ready } = usePersona();
  const showChooser = !ready || persona === null || !sessionPick;
  const showInstaller = ready && sessionPick && persona === "installer";

  return (
    <>
      <div className="surface-light">
        <LoiAperSection />
        {showChooser ? <HomeFeaturedNewsBanner /> : null}
        {showChooser ? <HomeSignupCta /> : null}
      </div>
      {showInstaller ? <InstallerTarifsSections /> : null}
    </>
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
    <div className="surface-pricing">
      <div className="container-x pt-14 sm:pt-16">
        <SectionEyebrow>Tarifs installateur</SectionEyebrow>
        <h2 className="pricing-headline mt-3">Choisissez votre accès aux chantiers</h2>
        <p className="pricing-lead mt-3 max-w-2xl">
          Paiement à l&apos;unité — leads de prospection ou accès aux coordonnées d&apos;un projet
          déposé. Aucun abonnement.
        </p>
      </div>

      <section id="tarifs" className="container-x py-10 sm:py-12">
        <h3 className="pricing-subhead">Leads automatisés</h3>
        <p className="pricing-sublead mt-2 max-w-xl">
          Deux niveaux selon la qualité Open Data. Vous achetez un lead, jamais un chantier garanti.
        </p>
        <div className="pricing-grid mt-8 md:grid-cols-3">
          <PricingCard
            title="Lead Standard"
            price={`${PRIX_LEAD.standard} €`}
            priceNote="par lead"
            features={[
              "Indice de confiance modéré (< 0,80)",
              "Surface parking parfois à confirmer sur site",
              "Contacts entreprise inclus",
              "Même tarif quelle que soit la surface",
            ]}
            cta="Parcourir"
            href="/leads"
          />
          <PricingCard
            title="Lead Premium"
            price={`${PRIX_LEAD.premium} €`}
            priceNote="par lead"
            features={[
              "Indice de confiance élevé (≥ 0,80)",
              "Peu de vérifications nécessaires",
              "Parking sans panneaux repérés",
              "Revêtement et surface cadastrale confirmés",
              "~10 % du catalogue",
            ]}
            cta="Filtrer Premium"
            href={premiumHref}
            featured
          />
          <PricingCard
            title="Pack Territoire"
            price={`${TERRITOIRE_PACK_EUR} €`}
            priceNote="achat unique"
            badge={`−${TERRITOIRE_PACK_DISCOUNT_PCT} %`}
            features={[
              `${TERRITOIRE_LEADS_QUOTA} leads crédités`,
              "Standard ou Premium : vous choisissez",
              "Crédit instantané · France entière",
            ]}
            cta="Acheter le pack"
            href="/pack-territoire"
          />
        </div>
      </section>

      <div className="pricing-split" aria-hidden />

      <section id="tarifs-appels-offres" className="container-x py-10 pb-16 sm:py-12 sm:pb-20">
        <h3 className="pricing-subhead">Appels d&apos;offres déposés</h3>
        <p className="pricing-sublead mt-2 max-w-xl">
          Coordonnées partagées par des gérants privés — mise en relation commerciale, hors marché
          public.
        </p>
        <div className="pricing-grid mt-8 md:grid-cols-2">
          <PricingCard
            title={`Parking < ${nfSurface(RFP_SURFACE_TIER_M2)} m²`}
            price={`${PRIX_RFP.sous_10000} €`}
            priceNote="par accès projet"
            features={[
              "Coordonnées du gérant",
              "Surface estimée inférieure à 10 000 m²",
              "Budget et délai indicatifs inclus",
            ]}
            cta="Voir les projets"
            href="/appels-offres"
          />
          <PricingCard
            title={`Parking ≥ ${nfSurface(RFP_SURFACE_TIER_M2)} m²`}
            price={`${PRIX_RFP.a_partir_10000} €`}
            priceNote="par accès projet"
            features={[
              "Coordonnées du gérant",
              "Grands parkings et zones commerciales",
              "Projets à plus forte valeur chantier",
            ]}
            cta="Voir les projets"
            href="/appels-offres?surface_min=10000"
            featured
          />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Détails juridiques :{" "}
          <Link href="/legal/cgu" className="text-solar hover:underline">
            CGU — dépôts de projets
          </Link>
        </p>
      </section>
    </div>
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

function PricingCard({
  title,
  price,
  priceNote,
  features,
  cta,
  href,
  featured = false,
  badge,
}: {
  title: string;
  price: string;
  priceNote?: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  badge?: string;
}) {
  return (
    <article
      className={`pricing-card ${featured ? "pricing-card-featured" : ""}`}
    >
      {badge ? <span className="pricing-card-badge">{badge}</span> : null}
      {featured ? <span className="pricing-card-tag">Populaire</span> : null}
      <h4 className="pricing-card-title">{title}</h4>
      <div className="pricing-card-price-block">
        <span className="pricing-card-price">{price}</span>
        {priceNote ? <span className="pricing-card-price-note">{priceNote}</span> : null}
      </div>
      <ul className="pricing-card-features">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Link
        href={href}
        className={`pricing-card-cta ${featured ? "btn-solar w-full" : "btn-ghost w-full"}`}
      >
        {cta}
      </Link>
    </article>
  );
}
