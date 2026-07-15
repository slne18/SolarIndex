"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TERRITOIRE_LEADS_QUOTA, TERRITOIRE_PACK_EUR } from "@/lib/subscription";
import { eurosCompact, nf } from "@/lib/format";
import type { TerritoireRadiusKm, TerritoireSummary } from "@/lib/territoire";

type BanFeature = {
  properties: { label: string };
  geometry: { coordinates: [number, number] };
};

const DEPARTEMENTS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "21",
  "22", "23", "24", "25", "26", "27", "28", "29", "30", "31",
  "32", "33", "34", "35", "36", "37", "38", "39", "40", "41",
  "42", "43", "44", "45", "46", "47", "48", "49", "50", "51",
  "52", "53", "54", "55", "56", "57", "58", "59", "60", "61",
  "62", "63", "64", "65", "66", "67", "68", "69", "70", "71",
  "72", "73", "74", "75", "76", "77", "78", "79", "80", "81",
  "82", "83", "84", "85", "86", "87", "88", "89", "90", "91",
  "92", "93", "94", "95",
  "2A", "2B",
];

export default function TerritoireClient() {
  const [mode, setMode] = useState<"address" | "departement">("address");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [selected, setSelected] = useState<{ label: string; lat: number; lon: number } | null>(null);
  const [departement, setDepartement] = useState("31");
  const [radiusKm, setRadiusKm] = useState<TerritoireRadiusKm>(50);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<TerritoireSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "address" || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/verifier/ban?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.features ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const url =
        mode === "departement"
          ? `/api/territoire?departement=${encodeURIComponent(departement)}`
          : `/api/territoire?lat=${selected!.lat}&lon=${selected!.lon}&radiusKm=${radiusKm}&label=${encodeURIComponent(selected!.label)}`;
      if (mode === "address" && !selected) {
        setError("Sélectionnez une adresse.");
        setLoading(false);
        return;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur.");
        return;
      }
      setSummary(data as TerritoireSummary);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  const exploreHref = useMemo(() => {
    if (!summary) return "/leads";
    if (summary.departement) return `/leads?departement=${summary.departement}`;
    return "/leads";
  }, [summary]);

  return (
    <div className="max-w-2xl">
      <div className="flex gap-2">
        <button
          type="button"
          className={`btn ${mode === "address" ? "btn-solar" : "btn-ghost"}`}
          onClick={() => setMode("address")}
        >
          Par adresse
        </button>
        <button
          type="button"
          className={`btn ${mode === "departement" ? "btn-solar" : "btn-ghost"}`}
          onClick={() => setMode("departement")}
        >
          Par département
        </button>
      </div>

      <div className="card mt-6 space-y-4 p-6">
        {mode === "address" ? (
          <>
            <label className="block text-sm font-medium">Votre adresse (siège ou entrepôt)</label>
            <div className="relative">
              <input
                className="input w-full"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Adresse en France"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/10 bg-night-900">
                  {suggestions.map((f, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                        onClick={() => {
                          const [lon, lat] = f.geometry.coordinates;
                          setSelected({ label: f.properties.label, lat, lon });
                          setQuery(f.properties.label);
                          setSuggestions([]);
                        }}
                      >
                        {f.properties.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="block text-sm font-medium">Rayon</label>
            <div className="flex gap-2">
              {([25, 50, 100] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`btn text-xs ${radiusKm === r ? "btn-solar" : "btn-ghost"}`}
                  onClick={() => setRadiusKm(r)}
                >
                  {r} km
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium">Département</label>
            <select
              className="input w-full"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
            >
              {DEPARTEMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </>
        )}

        <button type="button" className="btn-solar w-full" onClick={runAnalysis} disabled={loading}>
          {loading ? "Calcul en cours…" : "Analyser mon territoire"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {summary && (
        <div className="card mt-6 space-y-4 p-6">
          <h2 className="text-lg font-bold text-white">
            {summary.mode === "radius"
              ? `Dans un rayon de ${summary.radiusKm} km autour de ${summary.label}`
              : summary.label}
          </h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <strong className="text-white">{nf(summary.total)}</strong> leads disponibles
            </li>
            <li>
              <strong className="text-white">{nf(summary.urgences)}</strong> en Urgence Absolue
            </li>
            <li>
              {nf(summary.standard)} Standard · {nf(summary.premium)} Premium
            </li>
            <li>
              Valeur pipeline totale estimée :{" "}
              <strong className="text-solar">{eurosCompact(summary.pipelineEur)}</strong>
            </li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/pack-territoire" className="btn-solar">
              Pack Territoire — {TERRITOIRE_PACK_EUR} €, {TERRITOIRE_LEADS_QUOTA} leads
            </Link>
            <Link href={exploreHref} className="btn-ghost">
              Explorer tous les leads de cette zone →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
