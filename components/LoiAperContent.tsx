"use client";

import Link from "next/link";
import { APER_DEADLINES, APER_LAW_LINKS, APER_OBLIGATION_SUMMARY, APER_SURFACE_MIN_M2 } from "@/lib/aper-law";
import { HUWART_LAW_LINKS, HUWART_MIN_PANEL_PCT } from "@/lib/huwart-law";
import SectionEyebrow from "@/components/SectionEyebrow";
import RegulatoryCountdown from "@/components/RegulatoryCountdown";
import { useTranslations } from "@/components/LocaleProvider";
import { nfSurface } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";

export function LoiAperIntro() {
  const t = useTranslations();

  return (
    <div className="section-lead max-w-3xl space-y-4">
      <p>
        {t("home.aperIntro.p1Before")}
        <span className="font-semibold text-solar">APER</span>
        {t("home.aperIntro.p1After")}
      </p>
      <p>
        <strong>{t("home.aperIntro.p2Owners")}</strong>
        {t("home.aperIntro.p2Mid1")}
        <Link
          href="/loi-aper"
          className="font-semibold text-slate-800 underline decoration-solar decoration-2 underline-offset-[3px] transition hover:text-solar"
        >
          {t("home.aperIntro.p2Obligations")}
        </Link>
        {t("home.aperIntro.p2Mid2")}
        <strong>{t("home.aperIntro.p2Heritage")}</strong>
        {t("home.aperIntro.p2Mid3")}
        <strong>{t("home.aperIntro.p2Revenue")}</strong>
        {t("home.aperIntro.p2End")}
      </p>
      <p>
        {t("home.aperIntro.p3Before")}
        <strong>{t("home.aperIntro.p3Operators")}</strong>
        {t("home.aperIntro.p3After")}
      </p>
      <p>
        <strong>Solar</strong>
        <strong className="text-solar">Index</strong>
        {t("home.aperIntro.p4After")}
      </p>
    </div>
  );
}

export function LoiAperLegalRefs({ className = "mt-3" }: { className?: string }) {
  const t = useTranslations();

  return (
    <p className={`text-xs text-slate-500 ${className}`.trim()}>
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
  );
}

export function LoiAperCalendar() {
  const t = useTranslations();

  return (
    <>
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
    </>
  );
}

export function LoiAperObligationDetail() {
  const t = useTranslations();

  return (
    <div className="mt-10 space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{t("loiAper.detailTitle")}</h3>
        <p className="section-lead mt-3 max-w-3xl text-slate-600">{APER_OBLIGATION_SUMMARY}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="font-semibold text-slate-900">{t("loiAper.thresholdTitle")}</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {fmt(t("loiAper.thresholdBody"), { surface: nfSurface(APER_SURFACE_MIN_M2) })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="font-semibold text-slate-900">{t("loiAper.huwartTitle")}</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {fmt(t("loiAper.huwartBody"), { pct: HUWART_MIN_PANEL_PCT })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/verifier" className="btn-solar">
          {t("loiAper.ctaVerify")}
        </Link>
        <Link href="/simulateur" className="btn-ghost border border-slate-200 bg-white text-slate-800 hover:bg-slate-50">
          {t("loiAper.ctaSimulate")}
        </Link>
      </div>
    </div>
  );
}

export default function LoiAperContent({ showDetail = false }: { showDetail?: boolean }) {
  const t = useTranslations();

  return (
    <>
      <SectionEyebrow>{t("home.aperEyebrow")}</SectionEyebrow>
      <h2 className="section-title mt-3">{t("home.aperTitle")}</h2>
      <div className="mt-4">
        <LoiAperIntro />
      </div>
      <LoiAperLegalRefs />
      {showDetail ? <LoiAperObligationDetail /> : null}
      <LoiAperCalendar />
    </>
  );
}
