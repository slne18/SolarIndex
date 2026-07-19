"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import RegulatoryCountdown from "@/components/RegulatoryCountdown";
import { usePersona } from "@/components/PersonaProvider";
import { showOwnerProjectDeposit } from "@/lib/persona";
import { nf, nfSurface } from "@/lib/format";
import { PENTE_DEROGATION_PCT } from "@/lib/verifier/derogations";
import type { VerifierResult } from "@/lib/verifier/run";

type BanFeature = {
  properties: {
    label: string;
    score: number;
  };
  geometry: { coordinates: [number, number] };
};

export default function VerifierClient() {
  const { persona, ready } = usePersona();
  const showDepositCta = !ready || showOwnerProjectDeposit(persona);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [selected, setSelected] = useState<{ label: string; lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifierResult | null>(null);
  const [manualSurface, setManualSurface] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 3 || selected?.label === query) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/verifier/ban?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.features ?? []);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected?.label]);

  const runCheck = useCallback(
    async (opts?: { manualSurfaceM2?: number }) => {
      if (!selected) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch("/api/verifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: selected.lat,
            lon: selected.lon,
            label: selected.label,
            manualSurfaceM2: opts?.manualSurfaceM2,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Erreur de vérification.");
          return;
        }
        setResult(data as VerifierResult);
      } catch {
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    },
    [selected],
  );

  function pickSuggestion(f: BanFeature) {
    const [lon, lat] = f.geometry.coordinates;
    setSelected({ label: f.properties.label, lat, lon });
    setQuery(f.properties.label);
    setSuggestions([]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Sélectionnez une adresse dans la liste.");
      return;
    }
    void runCheck();
  }

  function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(manualSurface.replace(/\s/g, ""));
    if (!Number.isFinite(val) || val <= 0) {
      setError("Indiquez une surface valide en m².");
      return;
    }
    void runCheck({ manualSurfaceM2: val });
  }

  function rfpHref(): string {
    if (!result) return "/appels-offres/nouveau";
    const p = new URLSearchParams();
    p.set("adresse", result.label);
    if (result.surfaceM2) p.set("surface_estimee_m2", String(Math.round(result.surfaceM2)));
    if (result.derogations.derogationPente) p.set("derogation_pente", "1");
    if (result.derogations.zoneAbf) p.set("derogation_abf", "1");
    return `/appels-offres/nouveau?${p.toString()}`;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <form onSubmit={onSubmit} className="card p-6">
          <label className="block text-sm font-medium text-slate-200">
            Adresse du parking
          </label>
          <div className="relative mt-2">
            <input
              className="input w-full"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setResult(null);
              }}
              placeholder="12 avenue de la République, Toulouse"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-night-900 shadow-lg">
                {suggestions.map((f, i) => (
                  <li key={`${f.properties.label}-${i}`}>
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-white/5"
                      onClick={() => pickSuggestion(f)}
                    >
                      {f.properties.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" className="btn-solar mt-4 w-full sm:w-auto" disabled={loading}>
            {loading ? "Recherche de votre parking…" : "Vérifier l'éligibilité"}
          </button>
        </form>

        {loading && (
          <p className="mt-4 text-sm text-slate-400" role="status">
            Recherche de votre parking… Analyse OpenStreetMap et cadastre (2 à 8 s).
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {result?.needsManualSurface && !result.surfaceM2 && (
          <form onSubmit={onManualSubmit} className="card mt-6 space-y-4 p-6">
            <p className="text-sm text-slate-300">
              Aucun parking cartographié ni parcelle cadastrale trouvée à cette adresse.
              Indiquez la surface estimée du parking pour poursuivre l&apos;analyse.
            </p>
            <input
              className="input"
              type="number"
              min={1}
              step={1}
              value={manualSurface}
              onChange={(e) => setManualSurface(e.target.value)}
              placeholder="Surface en m²"
              required
            />
            <button type="submit" className="btn-solar" disabled={loading}>
              Analyser avec cette surface
            </button>
          </form>
        )}

        {result && result.surfaceM2 != null && (
          <div className="card mt-6 space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Adresse</p>
              <p className="mt-1 font-medium text-white">{result.label}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Stat label="Surface détectée" value={`${nfSurface(result.surfaceM2)} m²`} />
              <Stat
                label="Source"
                value={
                  result.surfaceSource === "osm_parking"
                    ? "OpenStreetMap (parking)"
                    : result.surfaceSource === "cadastre_parcelle"
                      ? "Cadastre (indicatif)"
                      : "Saisie manuelle"
                }
              />
            </div>

            {result.surfaceNote && (
              <p className="text-xs text-amber-200/90">{result.surfaceNote}</p>
            )}

            <div
              className={`rounded-xl border px-4 py-3 ${
                result.eligibility === "concerned"
                  ? "border-solar/40 bg-solar/10 text-solar"
                  : "border-white/10 bg-white/5 text-slate-200"
              }`}
            >
              <p className="font-semibold">{result.eligibilityLabel}</p>
            </div>

            {result.deadline && (
              <p className="text-sm text-slate-300">
                Échéance applicable : obligation {result.deadline.ratio} au{" "}
                <strong className="text-white">{result.deadline.date}</strong>
                {result.deadline.note ? ` — ${result.deadline.note}` : null}
              </p>
            )}

            {result.fineLabel && (
              <p className="text-sm text-slate-300">
                Amende potentielle : <strong className="text-white">{result.fineLabel}</strong>
              </p>
            )}

            <DerogationBlock result={result} />

            {showDepositCta ? (
              <Link href={rfpHref()} className="btn-mint inline-flex w-full justify-center sm:w-auto">
                Recevoir des devis gratuits
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <RegulatoryCountdown variant="full" wave="large" theme="dark" />
        <RegulatoryCountdown variant="full" wave="small" theme="dark" />
        <p className="text-xs leading-relaxed text-slate-500">
          Outil indicatif basé sur OpenStreetMap, le cadastre IGN et les données
          d&apos;altimétrie. Ne remplace pas une étude réglementaire officielle.
        </p>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-night-900/50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function DerogationBlock({ result }: { result: VerifierResult }) {
  const { derogations } = result;
  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <p className="text-sm font-semibold text-slate-200">Dérogations potentielles</p>

      {derogations.derogationPente && derogations.pentePct != null && (
        <p className="text-sm text-amber-100">
          ⚠️ Pente du terrain estimée à {nf(derogations.pentePct)} % — une dérogation à
          l&apos;obligation peut être envisageable (art. R111-19-4). Vérification recommandée
          auprès de votre mairie.
        </p>
      )}

      {derogations.zoneAbf && (
        <p className="text-sm text-amber-100">
          ⚠️ Ce site se situe dans un périmètre de protection du patrimoine (zone ABF).
          L&apos;installation peut nécessiter l&apos;accord de l&apos;Architecte des Bâtiments de
          France.
        </p>
      )}

      {derogations.summary === "none" && (
        <p className="text-sm text-emerald-300">
          ✅ Aucune dérogation identifiée à cette adresse.
        </p>
      )}

      <p className="text-xs text-slate-500">
        Ces éléments sont indicatifs (seuil pente {PENTE_DEROGATION_PCT} %) et ne remplacent pas
        une vérification officielle auprès des autorités compétentes.
      </p>
    </div>
  );
}
