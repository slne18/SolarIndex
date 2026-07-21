"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RfpLegalNotice from "@/components/RfpLegalNotice";
import {
  SimulatorBenefitDonut,
  SimulatorParkingVisual,
  SimulatorResultsSummary,
  SimulatorRoiTimeline,
} from "@/components/SimulatorResultVisuals";
import { usePersona } from "@/components/PersonaProvider";
import { useLocale, useTranslations } from "@/components/LocaleProvider";
import { showOwnerProjectDeposit } from "@/lib/persona";
import { euros, eurosCompact, nf, nfSurface } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import {
  DEFAULT_AUTOCONSUMPTION_RATIO,
  ELECTRICITY_PRICE_EUR,
  runParkingSolarSimulator,
  SIMULATOR_REGIONS,
} from "@/lib/solar-simulator";
import { formatAperAnnualFine } from "@/lib/aper-fine";

type SurfaceMode = "direct" | "dimensions";

const COUT_KWC = 1200;

export default function SimulateurClient() {
  const t = useTranslations();
  const { locale } = useLocale();
  const { persona, ready } = usePersona();
  const showDepositCta = !ready || showOwnerProjectDeposit(persona);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("direct");
  const [surfaceM2, setSurfaceM2] = useState(5000);
  const [lengthM, setLengthM] = useState(100);
  const [widthM, setWidthM] = useState(50);
  const [region, setRegion] = useState("Occitanie");
  const [consumption, setConsumption] = useState("");
  const [hasConsumption, setHasConsumption] = useState(false);

  const result = useMemo(
    () =>
      runParkingSolarSimulator({
        surface:
          surfaceMode === "direct"
            ? { mode: "direct", surfaceM2 }
            : { mode: "dimensions", lengthM, widthM },
        region,
        consumptionKwhPerYear: hasConsumption ? Number(consumption) || 0 : null,
      }),
    [surfaceMode, surfaceM2, lengthM, widthM, region, consumption, hasConsumption],
  );

  const ctaHref = (() => {
    const p = new URLSearchParams();
    p.set("surface_estimee_m2", String(result.surfaceM2));
    p.set("region", region);
    p.set(
      "notes_particulieres",
      `Simulation SolarIndex — région ${region}, ${nf(result.puissanceKwc)} kWc estimés, production ~${nf(result.productionKwhPerYear)} kWh/an.`,
    );
    return `/appels-offres/nouveau?${p.toString()}`;
  })();

  const priceLabel = ELECTRICITY_PRICE_EUR.toLocaleString(locale === "en" ? "en-US" : "fr-FR");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="card space-y-5 p-6">
          <p className="text-sm font-medium text-slate-200">{t("simulateur.yourParking")}</p>

          <div className="flex flex-wrap gap-2">
            <ModeBtn active={surfaceMode === "direct"} onClick={() => setSurfaceMode("direct")}>
              {t("simulateur.modeDirect")}
            </ModeBtn>
            <ModeBtn
              active={surfaceMode === "dimensions"}
              onClick={() => setSurfaceMode("dimensions")}
            >
              {t("simulateur.modeDimensions")}
            </ModeBtn>
          </div>

          {surfaceMode === "direct" ? (
            <Field label={t("simulateur.surfaceLabel")}>
              <input
                type="number"
                min={100}
                step={100}
                className="input w-full"
                value={surfaceM2}
                onChange={(e) => setSurfaceM2(Number(e.target.value) || 0)}
              />
              <input
                type="range"
                min={1500}
                max={50000}
                step={100}
                value={Math.min(50000, Math.max(1500, surfaceM2))}
                onChange={(e) => setSurfaceM2(Number(e.target.value))}
                className="mt-3 w-full accent-solar"
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("simulateur.lengthLabel")}>
                <input
                  type="number"
                  min={1}
                  className="input w-full"
                  value={lengthM}
                  onChange={(e) => setLengthM(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label={t("simulateur.widthLabel")}>
                <input
                  type="number"
                  min={1}
                  className="input w-full"
                  value={widthM}
                  onChange={(e) => setWidthM(Number(e.target.value) || 0)}
                />
              </Field>
              <p className="sm:col-span-2 text-sm text-slate-400">
                {t("simulateur.calculatedSurface")}{" "}
                <strong className="text-white">{nfSurface(lengthM * widthM)} m²</strong>
              </p>
            </div>
          )}

          <Field label={t("simulateur.regionLabel")}>
            <select
              className="input w-full"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {SIMULATOR_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {fmt(t("simulateur.yieldHint"), { yield: nf(result.yieldKwhPerKwc) })}
            </p>
          </Field>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={hasConsumption}
                onChange={(e) => setHasConsumption(e.target.checked)}
              />
              {t("simulateur.hasConsumption")}
            </label>
            {hasConsumption && (
              <Field label={t("simulateur.consumptionLabel")}>
                <input
                  type="number"
                  min={0}
                  className="input w-full"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  placeholder={t("simulateur.consumptionPlaceholder")}
                />
              </Field>
            )}
            {!hasConsumption && (
              <p className="text-xs text-slate-500">
                {fmt(t("simulateur.defaultAutoconsumption"), {
                  pct: Math.round(DEFAULT_AUTOCONSUMPTION_RATIO * 100),
                })}
              </p>
            )}
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <h2 className="text-lg font-bold text-white">{t("simulateur.resultsTitle")}</h2>
          <p className="text-xs text-slate-500">
            {fmt(t("simulateur.resultsDisclaimer"), { price: priceLabel })}
          </p>

          <SimulatorResultsSummary result={result} />

          <div className="simulator-visuals-grid">
            <SimulatorParkingVisual result={result} />
            <SimulatorBenefitDonut result={result} />
          </div>

          <SimulatorRoiTimeline result={result} />

          <details className="group rounded-xl border border-white/10 bg-night-900/20">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-300 marker:content-none [&::-webkit-details-marker]:hidden">
              {t("simulateur.detailsToggle")}
              <span className="ml-2 text-slate-500 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Result
                  label={t("simulateur.detailSolarSurface")}
                  value={`${nfSurface(result.surfaceSolaireM2)} m²`}
                  sub={fmt(t("simulateur.detailAperLaw"), { ratio: result.solarRatioLabel })}
                />
                <Result
                  label={t("simulateur.detailPower")}
                  value={`${nf(result.puissanceKwc)} kWc`}
                />
                <Result
                  label={t("simulateur.detailProduction")}
                  value={`${nf(result.productionKwhPerYear)} kWh/an`}
                  sub={fmt(t("simulateur.detailZone"), { region })}
                />
                <Result
                  label={t("simulateur.detailSavings")}
                  value={euros(result.autoconsommationSavingsEur) + t("simulateur.perYear")}
                  sub={fmt(t("simulateur.detailSelfConsumed"), {
                    kwh: nf(result.selfConsumedKwh),
                  })}
                />
                <Result
                  label={t("simulateur.detailSurplus")}
                  value={euros(result.surplusRevenueEur) + t("simulateur.perYear")}
                  sub={fmt(t("simulateur.detailSurplusSub"), {
                    kwh: nf(result.surplusKwh),
                    tariff: (result.edfOaTariff * 100).toFixed(2),
                  })}
                />
                <Result
                  label={t("simulateur.detailFullInjection")}
                  value={euros(result.edfOaFullInjectionEur) + t("simulateur.perYear")}
                  sub={t("simulateur.detailFullInjectionSub")}
                />
                {result.aperEligible && (
                  <Result
                    label={t("simulateur.detailFineAvoided")}
                    value={formatAperAnnualFine(result.surfaceM2) + t("simulateur.perYear")}
                    highlight
                  />
                )}
                <Result
                  label={t("simulateur.detailInstallCost")}
                  value={eurosCompact(result.installationCostEur)}
                  sub={fmt(t("simulateur.detailInstallSub"), { cost: nf(COUT_KWC) })}
                />
              </div>

              <div className="mt-4 rounded-xl border border-solar/30 bg-solar/10 px-4 py-3 text-sm text-slate-200">
                <p>
                  <strong className="text-solar">{t("simulateur.roiFullInjection")}</strong>{" "}
                  {result.roiYearsFullInjection != null
                    ? fmt(t("simulateur.roiYears"), { years: result.roiYearsFullInjection })
                    : "—"}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {t("simulateur.annualBenefitMix")}{" "}
                  {euros(result.autoconsommationTotalEur)}
                  {t("simulateur.perYear")}
                </p>
              </div>
            </div>
          </details>

          {showDepositCta ? (
            <Link href={ctaHref} className="btn-mint inline-flex w-full justify-center sm:w-auto">
              {t("simulateur.depositProject")}
            </Link>
          ) : null}
          <div className="mt-4">
            <RfpLegalNotice variant="compact" />
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5 text-sm text-slate-300">
          <p className="font-semibold text-white">{t("simulateur.asideTitle")}</p>
          <p className="mt-2 leading-relaxed">{t("simulateur.asideLead")}</p>
        </div>
        <div className="card p-5 text-xs leading-relaxed text-slate-500">
          <p>{t("simulateur.asideEdfNote")}</p>
          <p className="mt-2">
            <Link href="/verifier" className="text-solar hover:underline">
              {t("simulateur.checkEligibility")}
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active ? "bg-solar text-night" : "bg-white/5 text-slate-400 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Result({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight ? "border-solar/40 bg-solar/10" : "border-white/10 bg-night-900/40"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-solar" : "text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
