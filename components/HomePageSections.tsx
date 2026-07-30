"use client";

import Link from "next/link";
import { PRIX_LEAD } from "@/lib/leads";
import {
  TERRITOIRE_LEADS_QUOTA,
  TERRITOIRE_PACK_DISCOUNT_PCT,
  TERRITOIRE_PACK_EUR,
} from "@/lib/subscription";
import { PRIX_RFP, RFP_SURFACE_TIER_M2 } from "@/lib/rfp";
import { APER_DEADLINES, APER_LAW_LINKS } from "@/lib/aper-law";
import { HUWART_LAW_LINKS } from "@/lib/huwart-law";
import SectionEyebrow from "@/components/SectionEyebrow";
import RegulatoryCountdown from "@/components/RegulatoryCountdown";
import HomeFeaturedNewsBanner from "@/components/HomeFeaturedNewsBanner";
import { usePersona } from "@/components/PersonaProvider";
import { useLocale, useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";

export default function HomePageSections() {
  const { persona, sessionPick, ready } = usePersona();
  const showChooser = !ready || persona === null || !sessionPick;
  const showInstaller = ready && sessionPick && persona === "installer";

  return (
    <>
      <div className="surface-light">
        {showChooser ? <LoiAperSection /> : null}
      </div>
      {showChooser ? <HomeFeaturedNewsBanner /> : null}
      <div className="surface-light">
        {showChooser ? <HomeSignupCta /> : null}
      </div>
      {showInstaller ? <InstallerTarifsSections /> : null}
    </>
  );
}

function LoiAperSection() {
  const t = useTranslations();

  return (
    <section id="loi-aper" className="py-14 sm:py-20">
      <div className="container-x">
        <SectionEyebrow>{t("home.aperEyebrow")}</SectionEyebrow>
        <h2 className="section-title mt-3">{t("home.aperTitle")}</h2>
        <p className="section-lead mt-4">{t("home.aperSummary")}</p>
        <p className="mt-3 text-xs text-slate-500">
          <a
            href={APER_LAW_LINKS.loi2023Art40}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 underline decoration-slate-400 underline-offset-2 hover:text-solar hover:decoration-solar/60"
          >
            {t("home.aperRefLaw")}
          </a>
          {t("home.aperRefMid")}
          <a
            href={APER_LAW_LINKS.l111_19_1}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 underline decoration-slate-400 underline-offset-2 hover:text-solar hover:decoration-solar/60"
          >
            {t("home.aperRefEnergy")}
          </a>
          {t("home.aperRefClimate")}
          {t("home.aperRefHuwartMid")}
          <a
            href={HUWART_LAW_LINKS.loi2025}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 underline decoration-slate-400 underline-offset-2 hover:text-solar hover:decoration-solar/60"
          >
            {t("home.aperRefHuwart")}
          </a>
        </p>

        <div className="card mt-10 overflow-hidden">
          <div className="card-header border-b px-6 py-4 sm:px-8">
            <h3 className="font-semibold text-slate-900">{t("home.aperCalendarTitle")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("home.aperCalendarLead")}</p>
          </div>
          <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-8">
            {APER_DEADLINES.map((step) => (
              <RegulatoryCountdown key={step.id} variant="timeline" wave={step.id} />
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">{t("home.aperPublicNote")}</p>
      </div>
    </section>
  );
}

function InstallerTarifsSections() {
  const t = useTranslations();
  const { locale } = useLocale();
  const premiumHref = "/leads?tier=premium";
  const surfaceLabel = RFP_SURFACE_TIER_M2.toLocaleString(locale === "en" ? "en-US" : "fr-FR");

  return (
    <div className="surface-light">
      <div className="container-x pt-14 sm:pt-16">
        <SectionEyebrow>{t("home.pricingEyebrow")}</SectionEyebrow>
        <h2 className="pricing-headline mt-3">{t("home.pricingTitle")}</h2>
        <p className="pricing-lead mt-3 max-w-2xl">{t("home.pricingLead")}</p>
      </div>

      <section id="tarifs" className="container-x scroll-mt-24 py-10 sm:py-12">
        <h3 className="pricing-subhead">{t("home.pricingLeadsHead")}</h3>
        <p className="pricing-sublead mt-2 max-w-xl">{t("home.pricingLeadsLead")}</p>
        <div className="pricing-grid mt-8 md:grid-cols-3">
          <PricingCard
            title={t("home.pricingStandardTitle")}
            price={`${PRIX_LEAD.standard} €`}
            priceNote={t("home.pricingPerLead")}
            features={[
              t("home.pricingStandardF1"),
              t("home.pricingStandardF2"),
              t("home.pricingStandardF3"),
              t("home.pricingStandardF4"),
            ]}
            cta={t("home.pricingBrowse")}
            href="/leads"
            popularLabel={t("home.pricingPopular")}
          />
          <PricingCard
            title={t("home.pricingPremiumTitle")}
            price={`${PRIX_LEAD.premium} €`}
            priceNote={t("home.pricingPerLead")}
            features={[
              t("home.pricingPremiumF1"),
              t("home.pricingPremiumF2"),
              t("home.pricingPremiumF3"),
              t("home.pricingPremiumF4"),
              t("home.pricingPremiumF5"),
            ]}
            cta={t("home.pricingFilterPremium")}
            href={premiumHref}
            featured
            popularLabel={t("home.pricingPopular")}
          />
          <PricingCard
            title={t("home.pricingTerritoireTitle")}
            price={`${TERRITOIRE_PACK_EUR} €`}
            priceNote={t("home.pricingOneTime")}
            badge={`−${TERRITOIRE_PACK_DISCOUNT_PCT} %`}
            features={[
              fmt(t("home.pricingTerritoireF1"), { quota: TERRITOIRE_LEADS_QUOTA }),
              t("home.pricingTerritoireF2"),
              t("home.pricingTerritoireF3"),
            ]}
            cta={t("home.pricingBuyPack")}
            href="/pack-territoire"
            popularLabel={t("home.pricingPopular")}
          />
        </div>
      </section>

      <div className="pricing-split" aria-hidden />

      <section id="tarifs-appels-offres" className="container-x py-10 pb-16 sm:py-12 sm:pb-20">
        <h3 className="pricing-subhead">{t("home.pricingRfpHead")}</h3>
        <p className="pricing-sublead mt-2 max-w-xl">{t("home.pricingRfpLead")}</p>
        <div className="pricing-grid mt-8 md:grid-cols-2">
          <PricingCard
            title={fmt(t("home.pricingRfpSmallTitle"), { surface: surfaceLabel })}
            price={`${PRIX_RFP.sous_10000} €`}
            priceNote={t("home.pricingPerProject")}
            features={[
              t("home.pricingRfpF1"),
              t("home.pricingRfpSmallF2"),
              t("home.pricingRfpSmallF3"),
            ]}
            cta={t("home.pricingViewProjects")}
            href="/appels-offres"
            popularLabel={t("home.pricingPopular")}
          />
          <PricingCard
            title={fmt(t("home.pricingRfpLargeTitle"), { surface: surfaceLabel })}
            price={`${PRIX_RFP.a_partir_10000} €`}
            priceNote={t("home.pricingPerProject")}
            features={[
              t("home.pricingRfpF1"),
              t("home.pricingRfpLargeF2"),
              t("home.pricingRfpLargeF3"),
            ]}
            cta={t("home.pricingViewProjects")}
            href="/appels-offres?surface_min=10000"
            featured
            popularLabel={t("home.pricingPopular")}
          />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          {t("home.pricingLegal")}{" "}
          <Link href="/legal/cgu" className="text-solar hover:underline">
            {t("home.pricingLegalLink")}
          </Link>
        </p>
      </section>
    </div>
  );
}

function HomeSignupCta() {
  const t = useTranslations();

  return (
    <section className="container-x py-16 sm:py-24">
      <div className="card mx-auto max-w-3xl px-8 py-12 text-center sm:px-12">
        <h2 className="cta-card-title text-2xl font-bold tracking-tight sm:text-3xl">
          {t("home.signupTitle")}
        </h2>
        <p className="cta-card-lead mx-auto mt-4 max-w-lg text-base leading-relaxed">
          {t("home.signupLead")}
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/login?mode=signup&next=/" className="btn-solar min-w-[14rem]">
            {t("home.signupCta")}
          </Link>
        </div>
      </div>
    </section>
  );
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
  popularLabel,
}: {
  title: string;
  price: string;
  priceNote?: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  badge?: string;
  popularLabel: string;
}) {
  return (
    <article className={`pricing-card ${featured ? "pricing-card-featured" : ""}`}>
      {badge ? <span className="pricing-card-badge">{badge}</span> : null}
      {featured ? <span className="pricing-card-tag">{popularLabel}</span> : null}
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
