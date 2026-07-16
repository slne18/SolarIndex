import Link from "next/link";
import { PRIX_LEAD } from "@/lib/leads";
import {
  TERRITOIRE_LEADS_QUOTA,
  TERRITOIRE_PACK_DISCOUNT_PCT,
  TERRITOIRE_PACK_EUR,
} from "@/lib/subscription";
import { PRIX_RFP, RFP_SURFACE_TIER_M2 } from "@/lib/rfp";
import { APER_DEADLINES, APER_LAW_REF, APER_OBLIGATION_SUMMARY, APER_PUBLIC_PARKS_NOTE } from "@/lib/aper-law";
import SectionEyebrow from "@/components/SectionEyebrow";
import JsonLd from "@/components/JsonLd";
import RegulatoryCountdown from "@/components/RegulatoryCountdown";
import { buildPageMetadata } from "@/lib/seo-config";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = buildPageMetadata({
  title: "SolarIndex — Leads parkings APER & appels d'offres solaires",
  description:
    "Repérez les parkings non conformes à la loi APER avant l'amende. Leads B2B automatisés et appels d'offres déposés par les gérants pour installateurs photovoltaïques.",
  path: "/",
});

export default function HomePage() {
  const premiumHref = "/leads?tier=premium";

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
            description:
              "Index de parkings non conformes APER et marketplace d'appels d'offres pour installateurs solaires.",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            inLanguage: "fr-FR",
          },
        ]}
      />
      {/* ─── HERO ─── */}
      <section className="hero-surface relative overflow-hidden">
        <div className="container-x relative pt-14 pb-8 sm:pt-20 sm:pb-10">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <p className="pill-accent mx-auto w-fit">
              Parkings solaires APER · France entière
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              Repérez les parkings non conformes APER{" "}
              <span className="text-gradient">avant l&apos;amende.</span>
            </h1>
            <div className="mx-auto mt-5 max-w-2xl space-y-3 text-base leading-relaxed text-slate-400 sm:text-lg">
              <p>Deux sources de chantiers.</p>
              <p>
                <strong className="font-medium text-slate-300">Leads automatisés</strong> — nos outils
                repèrent en ligne chaque parking ≥ 1 500 m², l&apos;enrichissent cadastre & SIREN et le
                scorent pour une prospection B2B.
              </p>
              <p>
                <strong className="font-medium text-slate-300">Appels d&apos;offres</strong> — projets
                déposés directement par les gérants prêts à équiper.
              </p>
            </div>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/leads" className="btn-solar min-w-[15.5rem]">
                <RadarIcon />
                Accéder aux leads
              </Link>
              <Link href="/appels-offres" className="btn-mint min-w-[15.5rem]">
                <DocumentIcon />
                Accéder aux appels d&apos;offres
              </Link>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-14 sm:pb-16">
          <a
            href="#loi-aper"
            className="group flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-widest text-slate-500 transition hover:text-slate-300"
          >
            Découvrir
            <svg
              className="mt-1 h-4 w-4 animate-bounce text-slate-600 group-hover:text-solar"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </section>

      <div className="surface-light">
      {/* ─── LOI APER ─── */}
      <section id="loi-aper" className="py-14 sm:py-20">
        <div className="container-x">
          <SectionEyebrow>La loi APER</SectionEyebrow>
          <h2 className="section-title mt-3">
            Une obligation légale qui crée des chantiers
          </h2>
          <p className="section-lead mt-4">{APER_OBLIGATION_SUMMARY}</p>
          <p className="mt-3 text-xs text-slate-500">{APER_LAW_REF}</p>

          <AperTimeline />

          <p className="mt-4 text-xs leading-relaxed text-slate-500">{APER_PUBLIC_PARKS_NOTE}</p>
        </div>
      </section>

      {/* ─── TARIFS LEADS ─── */}
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

      {/* ─── TARIFS APPELS D'OFFRES ─── */}
      <section id="tarifs-appels-offres" className="border-t border-slate-200/80 py-14 sm:py-20">
        <div className="container-x">
          <SectionEyebrow>Consultation installateurs</SectionEyebrow>
          <h2 className="section-title mt-3">Projets déposés par les gérants</h2>
          <p className="section-lead">
            Contact direct fourni volontairement par le propriétaire ou exploitant privé du parking.
            Mise en relation commerciale — ne remplace pas un marché public. Tarif selon la surface
            estimée du projet.
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
            Consultation installateurs = mise en relation commerciale privée. Ne remplace pas un marché
            public.{" "}
            <Link href="/legal/cgv#rfp-deposants" className="text-solar-600 hover:underline">
              CGV §6
            </Link>
          </p>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="container-x py-16 sm:py-24">
        <div className="card mx-auto max-w-3xl px-8 py-12 text-center sm:px-12">
          <h2 className="cta-card-title text-2xl font-bold tracking-tight sm:text-3xl">
            L&apos;échéance APER approche.
          </h2>
          <p className="cta-card-lead mx-auto mt-4 max-w-lg text-base leading-relaxed">
            Des milliers de parkings à équiper : un flux de chantiers régulier, capté avant vos
            concurrents.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/leads" className="btn-solar">
              Leads
            </Link>
            <Link href="/appels-offres" className="btn-mint">
              Appels d&apos;offres
            </Link>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}

function AperTimeline() {
  return (
    <div className="card mt-10 overflow-hidden">
      <div className="card-header border-b px-6 py-4 sm:px-8">
        <h3 className="font-semibold text-slate-900">Calendrier de mise en conformité</h3>
        <p className="mt-1 text-sm text-slate-500">Parcs privés · seuil selon la superficie du parking</p>
      </div>

      <div className="grid gap-4 border-b border-slate-200 px-6 py-6 sm:grid-cols-2 sm:px-8">
        <RegulatoryCountdown variant="timeline" wave="large" />
        <RegulatoryCountdown variant="timeline" wave="small" />
      </div>

      <div className="group/timeline grid gap-4 px-6 py-8 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-10">
        {APER_DEADLINES.map((step, index) => (
          <AperMilestone key={step.id} {...step} index={index} />
        ))}
      </div>
    </div>
  );
}

function AperMilestone({
  year,
  month,
  date,
  surface,
  fine,
  status,
  index,
}: {
  year: string;
  month: string;
  date: string;
  surface: string;
  fine: string;
  status: "passed" | "current" | "upcoming";
  index: number;
}) {
  const isNext = status === "current";

  return (
    <div
      className="milestone-card group/milestone relative rounded-2xl border p-5 transition-all duration-300 ease-out sm:p-6 group-hover/timeline:opacity-40 hover:!opacity-100"
    >
      <div className="flex items-start gap-4">
        <div
          className="milestone-dot grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition-all duration-300 group-hover/milestone:border-solar group-hover/milestone:bg-solar group-hover/milestone:text-night group-hover/milestone:shadow-glow"
          aria-hidden
        >
          {status === "passed" ? (
            <svg
              className="transition-colors duration-300 group-hover/milestone:text-night"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            index + 1
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="milestone-year text-3xl font-extrabold tabular-nums tracking-tight transition-colors duration-300">
              {year}
            </span>
            <span className="text-sm font-medium uppercase tracking-wider text-slate-500">{month}</span>
            {isNext ? (
              <span className="rounded-full bg-solar/0 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-solar opacity-0 transition-all duration-300 group-hover/milestone:bg-solar/15 group-hover/milestone:opacity-100">
                Prochaine vague
              </span>
            ) : null}
          </div>

          <p className="milestone-surface mt-3 text-lg font-semibold transition-colors duration-300">
            {surface}
          </p>
          <p className="mt-1 text-sm text-slate-500">{date}</p>

          <div className="milestone-fine-box mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors duration-300 group-hover/milestone:border-solar/20 group-hover/milestone:bg-solar/[0.08]">
            <span className="text-slate-500">Amende max.</span>
            <span className="milestone-fine-value font-semibold tabular-nums transition-colors duration-300 group-hover/milestone:text-solar">
              {fine}
            </span>
          </div>
        </div>
      </div>
    </div>
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
      {popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-solar px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night">
          Populaire
        </span>
      )}
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

function RadarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" opacity="0.35" />
      <circle cx="12" cy="12" r="5.5" opacity="0.55" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 12 L20 6" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M8 4h8l2 2v14H6V4h2z" strokeLinejoin="round" />
      <path d="M8 4v2h8V4" />
      <path d="M9 11h6M9 14h6M9 17h4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
