"use client";

import { euros, eurosCompact, nf, nfSurface } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import { useLocale, useTranslations } from "@/components/LocaleProvider";
import {
  ELECTRICITY_PRICE_EUR,
  OPEX_EUR_PER_KWC,
  type SimulatorResult,
} from "@/lib/solar-simulator";

function selfConsumptionPct(result: SimulatorResult): number {
  if (result.productionKwhPerYear <= 0) return 0;
  return Math.round((result.selfConsumedKwh / result.productionKwhPerYear) * 100);
}

function surplusPct(result: SimulatorResult): number {
  if (result.productionKwhPerYear <= 0) return 0;
  return Math.round((result.surplusKwh / result.productionKwhPerYear) * 100);
}

function formatTariffCents(tariffEur: number, locale: string): string {
  const cents = (tariffEur * 100).toLocaleString(locale === "en" ? "en-US" : "fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${cents} c€`;
}

function formatPriceEur(locale: string): string {
  return ELECTRICITY_PRICE_EUR.toLocaleString(locale === "en" ? "en-US" : "fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SimulatorModeComparison({
  fullPv,
  mix,
}: {
  fullPv: SimulatorResult;
  mix: SimulatorResult;
}) {
  const t = useTranslations();

  return (
    <div className="simulator-mode-compare">
      <p className="simulator-mode-compare-title">{t("simulateur.modeCompareTitle")}</p>
      <div className="simulator-mode-compare-grid">
        <div className="simulator-mode-compare-col">
          <p className="simulator-mode-compare-head">{t("simulateur.solutionPvPur")}</p>
          <dl className="simulator-mode-compare-rows">
            <div>
              <dt>{t("simulateur.summaryNetGain")}</dt>
              <dd>
                {euros(fullPv.netOperatingBenefitEur)}
                {t("simulateur.perYear")}
              </dd>
            </div>
            <div>
              <dt>{t("simulateur.detailInstallCost")}</dt>
              <dd>{eurosCompact(fullPv.installationCostEur)}</dd>
            </div>
            <div>
              <dt>{t("simulateur.summaryRoi")}</dt>
              <dd>
                {fullPv.roiYearsNet != null
                  ? fmt(t("simulateur.roiYears"), { years: fullPv.roiYearsNet })
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="simulator-mode-compare-col simulator-mode-compare-col-mix">
          <p className="simulator-mode-compare-head">{t("simulateur.modeCompareMixCol")}</p>
          <dl className="simulator-mode-compare-rows">
            <div>
              <dt>{t("simulateur.summaryNetGain")}</dt>
              <dd>
                {euros(mix.netOperatingBenefitEur)}
                {t("simulateur.perYear")}
              </dd>
            </div>
            <div>
              <dt>{t("simulateur.detailInstallCost")}</dt>
              <dd>{eurosCompact(mix.installationCostEur)}</dd>
            </div>
            <div>
              <dt>{t("simulateur.summaryRoi")}</dt>
              <dd>
                {mix.roiYearsNet != null
                  ? fmt(t("simulateur.roiYears"), { years: mix.roiYearsNet })
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function SimulatorResultsPanel({
  result,
  region,
}: {
  result: SimulatorResult;
  region: string;
}) {
  const t = useTranslations();
  const { locale } = useLocale();
  const selfPct = selfConsumptionPct(result);
  const surPct = surplusPct(result);
  const isMix = result.solutionMode === "mixte_pv_vegetal";
  const priceLabel = formatPriceEur(locale);
  const edfTariffLabel = formatTariffCents(result.edfOaTariff, locale);
  const canopySurface = result.surfaceObligatoireTotaleM2;

  return (
    <div className="simulator-results-panel">
      <header className="simulator-results-header">
        <h3 className="simulator-results-header-title">{t("simulateur.resultsTitle")}</h3>
        <p className="simulator-results-header-meta">
          {fmt(t("simulateur.resultsHeaderMeta"), {
            price: priceLabel,
            edfTariff: edfTariffLabel,
            opex: nf(OPEX_EUR_PER_KWC),
          })}
        </p>
      </header>

      <div className="simulator-kpi-grid">
        <div className="simulator-kpi-card">
          <p className="simulator-kpi-label">{t("simulateur.summaryNetGain")}</p>
          <p className="simulator-kpi-value">
            {euros(result.netOperatingBenefitEur)}
            {t("simulateur.perYear")}
          </p>
          <p className="simulator-kpi-sub">{t("simulateur.summaryNetGainSub")}</p>
        </div>
        <div className="simulator-kpi-card">
          <p className="simulator-kpi-label">{t("simulateur.summaryRoi")}</p>
          <p className="simulator-kpi-value">
            {result.roiYearsNet != null
              ? fmt(t("simulateur.roiYears"), { years: result.roiYearsNet })
              : "—"}
          </p>
          <p className="simulator-kpi-sub">{t("simulateur.summaryRoiSub")}</p>
        </div>
        {result.aperEligible ? (
          <div className="simulator-kpi-card simulator-kpi-card-fine">
            <p className="simulator-kpi-label">{t("simulateur.summaryFine")}</p>
            <p className="simulator-kpi-value text-solar">
              {euros(result.fineAvoidedEur)}
              {t("simulateur.perYear")}
            </p>
            <p className="simulator-kpi-sub">{t("simulateur.summaryFineSub")}</p>
          </div>
        ) : null}
      </div>

      <div className="simulator-detail-grid">
        <section className="simulator-detail-card">
          <h4 className="simulator-detail-title">{t("simulateur.panelInstallation")}</h4>
          <dl className="simulator-detail-rows">
            <div>
              <dt>{t("simulateur.panelCanopySurface")}</dt>
              <dd>
                {nfSurface(canopySurface)} m²
                <span className="simulator-detail-badge">{t("simulateur.panelCompliant")}</span>
              </dd>
              {isMix ? (
                <dd className="simulator-detail-note">
                  {fmt(t("simulateur.panelCanopyMixSub"), {
                    pv: nfSurface(result.surfaceSolaireM2),
                    veg: nfSurface(result.surfaceVegetaliseeM2),
                  })}
                </dd>
              ) : null}
            </div>
            <div>
              <dt>{t("simulateur.panelPower")}</dt>
              <dd>{nf(result.puissanceKwc)} kWc</dd>
            </div>
            <div>
              <dt>{t("simulateur.panelProduction")}</dt>
              <dd>{nf(result.productionKwhPerYear)} kWh/an</dd>
            </div>
          </dl>

          <div className="simulator-detail-divider" />

          <p className="simulator-detail-section-label">{t("simulateur.panelElectricitySplit")}</p>
          <div
            className="simulator-production-bar"
            role="img"
            aria-label={fmt(t("simulateur.visualSelfConsumed"), {
              kwh: nf(result.selfConsumedKwh),
            })}
          >
            <div className="simulator-production-self" style={{ width: `${selfPct}%` }} />
            <div className="simulator-production-surplus" style={{ width: `${surPct}%` }} />
          </div>
          <ul className="simulator-production-legend">
            <li>
              <span className="simulator-legend-dot simulator-legend-dot-self" aria-hidden />
              {fmt(t("simulateur.panelSelfPct"), {
                pct: selfPct,
                kwh: nf(result.selfConsumedKwh),
              })}
            </li>
            <li>
              <span className="simulator-legend-dot simulator-legend-dot-surplus" aria-hidden />
              {fmt(t("simulateur.panelSurplusPct"), {
                pct: surPct,
                kwh: nf(result.surplusKwh),
              })}
            </li>
          </ul>

          <div className="simulator-detail-divider" />

          <div className="simulator-detail-capex">
            <span>{t("simulateur.panelCapex")}</span>
            <strong>{eurosCompact(result.installationCostEur)}</strong>
          </div>
          {isMix ? (
            <p className="simulator-detail-note">
              {fmt(t("simulateur.panelCapexMixSub"), {
                pv: eurosCompact(result.installationCostPvEur),
                veg: eurosCompact(result.installationCostVegetationEur),
              })}
            </p>
          ) : null}
        </section>

        <section className="simulator-detail-card">
          <h4 className="simulator-detail-title">{t("simulateur.panelCashflows")}</h4>
          <ul className="simulator-flow-list">
            <li className="simulator-flow-line simulator-flow-positive">
              <span className="simulator-flow-icon" aria-hidden>
                +
              </span>
              <div className="min-w-0 flex-1">
                <p className="simulator-flow-label">{t("simulateur.flowSavings")}</p>
                <p className="simulator-flow-detail">
                  {fmt(t("simulateur.flowSavingsDetail"), {
                    kwh: nf(result.selfConsumedKwh),
                    price: priceLabel,
                  })}
                </p>
              </div>
              <span className="simulator-flow-amount">
                + {euros(result.autoconsommationSavingsEur)}
                {t("simulateur.perYear")}
              </span>
            </li>
            <li className="simulator-flow-line simulator-flow-positive">
              <span className="simulator-flow-icon" aria-hidden>
                +
              </span>
              <div className="min-w-0 flex-1">
                <p className="simulator-flow-label">{t("simulateur.flowSurplus")}</p>
                <p className="simulator-flow-detail">
                  {fmt(t("simulateur.flowSurplusDetail"), {
                    kwh: nf(result.surplusKwh),
                    tariff: (result.edfOaTariff * 100).toFixed(2),
                  })}
                </p>
              </div>
              <span className="simulator-flow-amount">
                + {euros(result.surplusRevenueEur)}
                {t("simulateur.perYear")}
              </span>
            </li>
            <li className="simulator-flow-line simulator-flow-negative">
              <span className="simulator-flow-icon" aria-hidden>
                −
              </span>
              <div className="min-w-0 flex-1">
                <p className="simulator-flow-label">{t("simulateur.flowOpex")}</p>
                <p className="simulator-flow-detail">
                  {fmt(t("simulateur.flowOpexDetail"), {
                    opex: nf(OPEX_EUR_PER_KWC),
                  })}
                </p>
              </div>
              <span className="simulator-flow-amount">
                − {euros(result.opexEurPerYear)}
                {t("simulateur.perYear")}
              </span>
            </li>
          </ul>

          <div className="simulator-detail-divider" />

          <div className="simulator-flow-total">
            <span>{t("simulateur.flowNetTotal")}</span>
            <strong>
              = {euros(result.netOperatingBenefitEur)}
              {t("simulateur.perYear")}
            </strong>
          </div>

          <p className="simulator-detail-note mt-3">{fmt(t("simulateur.panelRegionNote"), { region })}</p>
        </section>
      </div>
    </div>
  );
}
