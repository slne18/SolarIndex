"use client";

import { euros, nf, nfSurface } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import { useTranslations } from "@/components/LocaleProvider";
import type { SimulatorResult } from "@/lib/solar-simulator";

type BenefitSegment = {
  id: string;
  label: string;
  value: number;
  color: string;
};

function benefitSegments(result: SimulatorResult, t: ReturnType<typeof useTranslations>): BenefitSegment[] {
  const segments: BenefitSegment[] = [
    {
      id: "savings",
      label: t("simulateur.segSavings"),
      value: result.autoconsommationSavingsEur,
      color: "var(--sim-seg-savings)",
    },
    {
      id: "surplus",
      label: t("simulateur.segSurplus"),
      value: result.surplusRevenueEur,
      color: "var(--sim-seg-surplus)",
    },
  ];
  if (result.aperEligible && result.fineAvoidedEur > 0) {
    segments.push({
      id: "fine",
      label: t("simulateur.segFine"),
      value: result.fineAvoidedEur,
      color: "var(--sim-seg-fine)",
    });
  }
  return segments.filter((s) => s.value > 0);
}

function totalAnnualBenefit(result: SimulatorResult): number {
  return result.autoconsommationTotalEur + (result.aperEligible ? result.fineAvoidedEur : 0);
}

export function SimulatorResultsSummary({ result }: { result: SimulatorResult }) {
  const t = useTranslations();
  const totalBenefit = totalAnnualBenefit(result);

  return (
    <div className="simulator-summary-grid">
      <div className="simulator-summary-card">
        <p className="simulator-summary-label">{t("simulateur.summaryAnnualGain")}</p>
        <p className="simulator-summary-value">
          {euros(totalBenefit)}
          {t("simulateur.perYear")}
        </p>
        <p className="simulator-summary-sub">
          {t("simulateur.summaryAnnualGainSub")}
          {result.aperEligible ? t("simulateur.summaryAnnualGainSubFine") : ""}
        </p>
      </div>
      <div className="simulator-summary-card">
        <p className="simulator-summary-label">{t("simulateur.summaryRoi")}</p>
        <p className="simulator-summary-value">
          {result.roiYearsAutoconsommation != null
            ? `${result.roiYearsAutoconsommation} ${t("simulateur.years")}`
            : "—"}
        </p>
        <p className="simulator-summary-sub">{t("simulateur.summaryRoiSub")}</p>
      </div>
      {result.aperEligible ? (
        <div className="simulator-summary-card">
          <p className="simulator-summary-label">{t("simulateur.summaryFine")}</p>
          <p className="simulator-summary-value text-solar">
            {euros(result.fineAvoidedEur)}
            {t("simulateur.perYear")}
          </p>
          <p className="simulator-summary-sub">{t("simulateur.summaryFineSub")}</p>
        </div>
      ) : null}
    </div>
  );
}

export function SimulatorParkingVisual({ result }: { result: SimulatorResult }) {
  const t = useTranslations();
  const solarPct = result.surfaceM2 > 0 ? (result.surfaceSolaireM2 / result.surfaceM2) * 100 : 0;
  const restPct = Math.max(0, 100 - solarPct);
  const prodTotal = result.productionKwhPerYear || 1;
  const selfPct = (result.selfConsumedKwh / prodTotal) * 100;
  const surplusPct = (result.surplusKwh / prodTotal) * 100;

  return (
    <figure className="simulator-visual-card">
      <figcaption className="simulator-visual-title">{t("simulateur.visualParkingTitle")}</figcaption>

      <div className="simulator-parking-plan" aria-hidden>
        <div className="simulator-parking-solar" style={{ width: `${solarPct}%` }}>
          <span>{fmt(t("simulateur.visualCanopies"), { ratio: result.solarRatioLabel })}</span>
        </div>
        <div className="simulator-parking-rest" style={{ width: `${restPct}%` }}>
          <span>{t("simulateur.visualRest")}</span>
        </div>
      </div>

      <dl className="simulator-parking-stats">
        <div>
          <dt>{t("simulateur.visualParkingSurface")}</dt>
          <dd>{nfSurface(result.surfaceM2)} m²</dd>
        </div>
        <div>
          <dt>{t("simulateur.visualSolarSurface")}</dt>
          <dd>{nfSurface(result.surfaceSolaireM2)} m²</dd>
        </div>
        <div>
          <dt>{t("simulateur.visualPower")}</dt>
          <dd>{nf(result.puissanceKwc)} kWc</dd>
        </div>
      </dl>

      <p className="simulator-visual-caption">{t("simulateur.visualProductionSplit")}</p>
      <div
        className="simulator-production-bar"
        role="img"
        aria-label={`${nf(result.selfConsumedKwh)} kWh, ${nf(result.surplusKwh)} kWh`}
      >
        <div className="simulator-production-self" style={{ width: `${selfPct}%` }} />
        <div className="simulator-production-surplus" style={{ width: `${surplusPct}%` }} />
      </div>
      <ul className="simulator-production-legend">
        <li>
          <span className="simulator-legend-dot simulator-legend-dot-self" aria-hidden />
          {fmt(t("simulateur.visualSelfConsumed"), { kwh: nf(result.selfConsumedKwh) })}
        </li>
        <li>
          <span className="simulator-legend-dot simulator-legend-dot-surplus" aria-hidden />
          {fmt(t("simulateur.visualSurplus"), { kwh: nf(result.surplusKwh) })}
        </li>
      </ul>
    </figure>
  );
}

export function SimulatorBenefitDonut({ result }: { result: SimulatorResult }) {
  const t = useTranslations();
  const segments = benefitSegments(result, t);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const arcs =
    total > 0
      ? segments.map((seg) => {
          const len = (seg.value / total) * c;
          const dash = `${len} ${c - len}`;
          const dashOffset = -offset;
          offset += len;
          return { ...seg, dash, dashOffset };
        })
      : [];

  return (
    <figure className="simulator-visual-card">
      <figcaption className="simulator-visual-title">{t("simulateur.visualBenefitsTitle")}</figcaption>

      <div className="simulator-donut-wrap">
        <svg viewBox="0 0 100 100" className="simulator-donut" aria-hidden>
          <circle cx="50" cy="50" r={r} className="simulator-donut-track" />
          {arcs.map((arc) => (
            <circle
              key={arc.id}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth="16"
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.dashOffset}
              transform="rotate(-90 50 50)"
            />
          ))}
        </svg>
        <div className="simulator-donut-center">
          <p className="simulator-donut-total">{total > 0 ? euros(total) : "—"}</p>
          <p className="simulator-donut-total-label">{t("simulateur.perYear")}</p>
        </div>
      </div>

      <ul className="simulator-benefit-legend">
        {segments.map((seg) => (
          <li key={seg.id}>
            <span className="simulator-legend-dot" style={{ background: seg.color }} aria-hidden />
            <span className="min-w-0 flex-1">{seg.label}</span>
            <span className="font-semibold tabular-nums text-slate-200">{euros(seg.value)}</span>
          </li>
        ))}
        {total === 0 ? (
          <li className="text-sm text-slate-500">{t("simulateur.visualAdjustSurface")}</li>
        ) : null}
      </ul>
    </figure>
  );
}

export function SimulatorRoiTimeline({ result }: { result: SimulatorResult }) {
  const t = useTranslations();
  const benefit = result.autoconsommationTotalEur;
  const years = result.roiYearsAutoconsommation;
  const horizon = 15;
  const fillPct = years != null && years > 0 ? Math.min(100, (years / horizon) * 100) : 0;

  return (
    <div className="simulator-roi-bar">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-200">{t("simulateur.roiTitle")}</p>
        <p className="text-sm tabular-nums text-solar">
          {years != null ? `${years} ${t("simulateur.years")}` : "—"}
        </p>
      </div>
      <div className="simulator-roi-track" aria-hidden>
        <div className="simulator-roi-fill" style={{ width: `${fillPct}%` }} />
        {years != null && years <= horizon ? (
          <span className="simulator-roi-marker" style={{ left: `${fillPct}%` }} />
        ) : null}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {fmt(t("simulateur.roiFootnote"), {
          invest: euros(result.installationCostEur),
          benefit: euros(benefit),
          horizon,
        })}
      </p>
    </div>
  );
}
