"use client";

import { useMemo, useState } from "react";
import { eurosCompact, nf } from "@/lib/format";

interface SolarSimulatorProps {
  initialSurface?: number;
  locked?: boolean;
  surfaceFromLead?: number;
}

const MIN = 1500;
const MAX = 80000;

// Formules identiques au pipeline Python.
function compute(surface: number) {
  const surfaceSolaire = surface * 0.5;
  const puissanceKwc = Math.round(surfaceSolaire / 5);
  const valeurChantier = puissanceKwc * 1200;
  const isUrgence = surface >= 10000;
  return { surfaceSolaire, puissanceKwc, valeurChantier, isUrgence };
}

export default function SolarSimulator({
  initialSurface = 12000,
  locked = false,
  surfaceFromLead,
}: SolarSimulatorProps) {
  const [surface, setSurface] = useState(surfaceFromLead ?? initialSurface);
  const { surfaceSolaire, puissanceKwc, valeurChantier, isUrgence } = useMemo(
    () => compute(surface),
    [surface],
  );

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-baseline justify-between">
        <label htmlFor="surface" className="text-sm font-medium text-slate-800">
          Surface parking (m²)
        </label>
        <span className="text-2xl font-bold text-solar">{nf(surface)} m²</span>
      </div>

      <input
        id="surface"
        type="range"
        min={MIN}
        max={MAX}
        step={100}
        value={surface}
        disabled={locked}
        onChange={(e) => setSurface(Number(e.target.value))}
        className="mt-4 w-full cursor-pointer accent-solar disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{nf(MIN)}</span>
        <span>{nf(MAX)}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat title="Surface solaire" value={`${nf(surfaceSolaire)} m²`} sub="50% légal" />
        <Stat title="Puissance crête" value={`${nf(puissanceKwc)} kWc`} sub="estimés" />
        <Stat title="Valeur chantier" value={eurosCompact(valeurChantier)} sub="estimation" highlight />
      </div>

      <div
        className={`mt-6 rounded-lg px-4 py-3 text-sm font-medium ${
          isUrgence
            ? "border border-red-200 bg-red-50 text-red-800"
            : "border border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {isUrgence
          ? "🔴 URGENCE ABSOLUE — parking ≥ 10 000 m², priorité maximale"
          : "🟡 Mise en conformité requise — seuil APER atteint"}
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  sub,
  highlight = false,
}: {
  title: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center ${
        highlight ? "border-solar/40 bg-amber-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`mt-2 text-xl font-bold ${highlight ? "text-solar" : "text-slate-900"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}
