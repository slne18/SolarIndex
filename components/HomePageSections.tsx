"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRIX_LEAD } from "@/lib/leads";
import { PRIX_PLATEFORME_MENSUEL } from "@/lib/platform-access";
import type { PricingStats } from "@/lib/pricing-stats";
import { PRIX_RFP, RFP_SURFACE_TIER_M2 } from "@/lib/rfp";
import LoiAperContent from "@/components/LoiAperContent";
import SectionEyebrow from "@/components/SectionEyebrow";
import HomeFeaturedNewsBanner from "@/components/HomeFeaturedNewsBanner";
import HomeInstallerPageSections from "@/components/HomeInstallerPageSections";
import HomeInstallerFaqSection from "@/components/HomeInstallerFaqSection";
import HomeOwnerPageSections from "@/components/HomeOwnerPageSections";
import { usePersona } from "@/components/PersonaProvider";
import { useLocale, useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";

export default function HomePageSections() {
  const { persona, sessionPick, ready } = usePersona();
  const showChooser = !ready || persona === null || !sessionPick;
  const showOwner = ready && sessionPick && persona === "owner";
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
      {showOwner ? <HomeOwnerPageSections /> : null}
      {showInstaller ? (
        <>
          <HomeInstallerPageSections />
          <InstallerTarifsSections />
          <HomeInstallerFaqSection />
        </>
      ) : null}
    </>
  );
}

function LoiAperSection() {
  return (
    <section id="loi-aper" className="py-14 sm:py-20">
      <div className="container-x">
        <LoiAperContent />
      </div>
    </section>
  );
}

function InstallerTarifsSections() {
  const t = useTranslations();
  const { locale } = useLocale();
  const premiumHref = "/leads?tier=premium";
  const surfaceLabel = RFP_SURFACE_TIER_M2.toLocaleString(locale === "en" ? "en-US" : "fr-FR");
  const [stats, setStats] = useState<PricingStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pricing-stats");
        if (!res.ok) return;
        const data = (await res.json()) as PricingStats;
        if (!cancelled) setStats(data);
      } catch {
        /* ignore — affichage sans % dynamique */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const platformFeatures = [
    stats
      ? fmt(t("home.pricingPlatformF1"), {
          pct: stats.leads_platform_pct,
          count: stats.leads_platform.toLocaleString(locale === "en" ? "en-US" : "fr-FR"),
        })
      : t("home.pricingPlatformF1Fallback"),
    stats?.rfp_public
      ? fmt(t("home.pricingPlatformF2"), {
          count: stats.rfp_public.toLocaleString(locale === "en" ? "en-US" : "fr-FR"),
        })
      : t("home.pricingPlatformF2Fallback"),
    t("home.pricingPlatformF3"),
    t("home.pricingPlatformF4"),
  ];

  const premiumCatalogShare = stats
    ? fmt(t("home.pricingPremiumF4"), { pct: Math.max(0, 100 - stats.leads_platform_pct) })
    : t("home.pricingPremiumF4Fallback");

  return (
    <div className="surface-light border-t border-slate-100">
      <div className="container-x pt-14 sm:pt-16 text-center">
        <SectionEyebrow>{t("home.pricingEyebrow")}</SectionEyebrow>
        <h2 className="pricing-headline mt-3 text-slate-900">{t("home.pricingTitle")}</h2>
        <p className="pricing-lead mx-auto mt-3 max-w-2xl text-slate-600">{t("home.pricingLead")}</p>
      </div>

      <section id="tarifs" className="container-x scroll-mt-24 py-10 sm:py-12">
        <h3 className="pricing-subhead text-center text-slate-900">{t("home.pricingLeadsHead")}</h3>
        <p className="pricing-sublead mx-auto mt-2 max-w-xl text-center text-slate-600">
          {t("home.pricingLeadsLead")}
        </p>
        <div className="pricing-grid mt-8 md:grid-cols-2">
          <PricingCard
            title={t("home.pricingPlatformTitle")}
            price={`${PRIX_PLATEFORME_MENSUEL} €`}
            priceNote={t("home.pricingPerMonth")}
            features={platformFeatures}
            cta={t("home.pricingSubscribe")}
            href="/login?mode=signup&next=/leads"
            featured
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
              premiumCatalogShare,
            ]}
            cta={t("home.pricingFilterPremium")}
            href={premiumHref}
            popularLabel={t("home.pricingPopular")}
          />
        </div>
      </section>

      <div className="pricing-split" aria-hidden />

      <section id="tarifs-appels-offres" className="container-x py-10 pb-16 sm:py-12 sm:pb-20">
        <h3 className="pricing-subhead text-center text-slate-900">{t("home.pricingRfpHead")}</h3>
        <p className="pricing-sublead mx-auto mt-2 max-w-xl text-center text-slate-600">
          {t("home.pricingRfpLead")}
        </p>
        <div className="pricing-grid mt-8 md:grid-cols-2">
          <PricingCard
            title={fmt(t("home.pricingRfpSmallTitle"), { surface: surfaceLabel })}
            price={`${PRIX_RFP.sous_10000} €`}
            priceNote={t("home.pricingPerProjectPrivate")}
            features={[
              t("home.pricingRfpPrivateF1"),
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
            priceNote={t("home.pricingPerProjectPrivate")}
            features={[
              t("home.pricingRfpPrivateF1"),
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
          <Link href="/legal/cgv" className="text-solar hover:underline">
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
