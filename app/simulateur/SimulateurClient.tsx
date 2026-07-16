"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RfpLegalNotice from "@/components/RfpLegalNotice";
import { euros, eurosCompact, nf, nfSurface } from "@/lib/format";
import {
  DEFAULT_AUTOCONSUMPTION_RATIO,
  ELECTRICITY_PRICE_EUR,
  runParkingSolarSimulator,
  SIMULATOR_REGIONS,
} from "@/lib/solar-simulator";
import { formatAperAnnualFine } from "@/lib/aper-fine";

type SurfaceMode = "direct" | "dimensions";

export default function SimulateurClient() {
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="card space-y-5 p-6">
          <p className="text-sm font-medium text-slate-200">Votre parking</p>

          <div className="flex flex-wrap gap-2">
            <ModeBtn active={surfaceMode === "direct"} onClick={() => setSurfaceMode("direct")}>
              Surface en m²
            </ModeBtn>
            <ModeBtn
              active={surfaceMode === "dimensions"}
              onClick={() => setSurfaceMode("dimensions")}
            >
              Longueur × largeur
            </ModeBtn>
          </div>

          {surfaceMode === "direct" ? (
            <Field label="Surface du parking (m²)">
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
              <Field label="Longueur (m)">
                <input
                  type="number"
                  min={1}
                  className="input w-full"
                  value={lengthM}
                  onChange={(e) => setLengthM(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Largeur (m)">
                <input
                  type="number"
                  min={1}
                  className="input w-full"
                  value={widthM}
                  onChange={(e) => setWidthM(Number(e.target.value) || 0)}
                />
              </Field>
              <p className="sm:col-span-2 text-sm text-slate-400">
                Surface calculée :{" "}
                <strong className="text-white">{nfSurface(lengthM * widthM)} m²</strong>
              </p>
            </div>
          )}

          <Field label="Région (ensoleillement)">
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
              Productivité estimée : {nf(result.yieldKwhPerKwc)} kWh/kWc/an
            </p>
          </Field>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={hasConsumption}
                onChange={(e) => setHasConsumption(e.target.checked)}
              />
              J&apos;ai une consommation électrique annuelle du site
            </label>
            {hasConsumption && (
              <Field label="Consommation annuelle (kWh/an)">
                <input
                  type="number"
                  min={0}
                  className="input w-full"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  placeholder="Ex. 850000"
                />
              </Field>
            )}
            {!hasConsumption && (
              <p className="text-xs text-slate-500">
                Autoconsommation estimée à {Math.round(DEFAULT_AUTOCONSUMPTION_RATIO * 100)} %
                (éclairage, bornes, locaux techniques).
              </p>
            )}
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <h2 className="text-lg font-bold text-white">Résultats de simulation</h2>
          <p className="text-xs text-slate-500">
            Estimations indicatives — ne constituent pas un devis. Tarif électricité retenu :{" "}
            {ELECTRICITY_PRICE_EUR.toLocaleString("fr-FR")} €/kWh.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Result
              label="Surface solaire obligatoire"
              value={`${nfSurface(result.surfaceSolaireM2)} m²`}
              sub={`${result.solarRatioLabel} (loi APER)`}
            />
            <Result
              label="Puissance installée estimée"
              value={`${nf(result.puissanceKwc)} kWc`}
            />
            <Result
              label="Production annuelle estimée"
              value={`${nf(result.productionKwhPerYear)} kWh/an`}
              sub={`Zone : ${region}`}
            />
            <Result
              label="Économies autoconsommation"
              value={euros(result.autoconsommationSavingsEur) + "/an"}
              sub={`${nf(result.selfConsumedKwh)} kWh autoconsommés`}
            />
            <Result
              label="Revenus revente surplus EDF OA"
              value={euros(result.surplusRevenueEur) + "/an"}
              sub={`${nf(result.surplusKwh)} kWh × ${(result.edfOaTariff * 100).toFixed(2)} c€`}
            />
            <Result
              label="Revenus injection totale EDF OA"
              value={euros(result.edfOaFullInjectionEur) + "/an"}
              sub="Scénario vente intégrale (indicatif)"
            />
            {result.aperEligible && (
              <Result
                label="Amende évitée"
                value={formatAperAnnualFine(result.surfaceM2) + "/an"}
                highlight
              />
            )}
            <Result
              label="Coût d'installation estimé"
              value={eurosCompact(result.installationCostEur)}
              sub={`${nf(COUT_KWC)} €/kWc marché`}
            />
          </div>

          <div className="rounded-xl border border-solar/30 bg-solar/10 px-4 py-3 text-sm text-slate-200">
            <p>
              <strong className="text-solar">ROI autoconsommation :</strong>{" "}
              {result.roiYearsAutoconsommation != null
                ? `${result.roiYearsAutoconsommation} ans`
                : "—"}{" "}
              (hors amende évitée)
            </p>
            <p className="mt-1">
              <strong className="text-solar">ROI injection totale :</strong>{" "}
              {result.roiYearsFullInjection != null
                ? `${result.roiYearsFullInjection} ans`
                : "—"}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Bénéfice annuel autoconsommation (économies + surplus) :{" "}
              {euros(result.autoconsommationTotalEur)}/an
            </p>
          </div>

          <Link href={ctaHref} className="btn-mint inline-flex w-full justify-center sm:w-auto">
            Déposer un projet
          </Link>
          <div className="mt-4">
            <RfpLegalNotice variant="compact" />
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5 text-sm text-slate-300">
          <p className="font-semibold text-white">Pour les gestionnaires de parking</p>
          <p className="mt-2 leading-relaxed">
            Voyez ce que vous pouvez gagner (économies, revenus solaires, amende évitée) avant de
            consulter des installateurs qualifiés via notre formulaire (acteurs privés, hors marchés
            publics).
          </p>
        </div>
        <div className="card p-5 text-xs leading-relaxed text-slate-500">
          <p>
            Tarifs EDF OA : valeurs indicatives arrêté S21 (métropole). Les projets &gt; 100 kWc
            peuvent relever d&apos;appels d&apos;offres CRE depuis sept. 2025.
          </p>
          <p className="mt-2">
            <Link href="/verifier" className="text-solar hover:underline">
              Vérifier l&apos;éligibilité APER →
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}

const COUT_KWC = 1200;

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
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-solar" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
