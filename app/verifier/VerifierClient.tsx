"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import RegulatoryCountdown from "@/components/RegulatoryCountdown";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import { showOwnerProjectDeposit } from "@/lib/persona";
import { nf, nfSurface } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import { PENTE_DEROGATION_PCT } from "@/lib/verifier/derogations";
import type { AperEligibilityStatus } from "@/lib/aper-deadlines";
import type { VerifierResult } from "@/lib/verifier/run";

type BanFeature = {
  properties: {
    label: string;
    score: number;
  };
  geometry: { coordinates: [number, number] };
};

function useEligibilityLabel() {
  const t = useTranslations();
  return (status: AperEligibilityStatus) => {
    switch (status) {
      case "concerned":
        return t("verifier.eligibility.concerned");
      case "below_threshold":
        return t("verifier.eligibility.below");
      case "manual_required":
        return t("verifier.eligibility.manual");
    }
  };
}

export default function VerifierClient() {
  const t = useTranslations();
  const eligibilityLabel = useEligibilityLabel();
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
          setError(data.error || t("verifier.verifyError"));
          return;
        }
        setResult(data as VerifierResult);
      } catch {
        setError(t("onboarding.networkError"));
      } finally {
        setLoading(false);
      }
    },
    [selected, t],
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
      setError(t("verifier.selectAddress"));
      return;
    }
    void runCheck();
  }

  function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(manualSurface.replace(/\s/g, ""));
    if (!Number.isFinite(val) || val <= 0) {
      setError(t("verifier.invalidSurface"));
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

  function surfaceSourceLabel(source: VerifierResult["surfaceSource"]): string {
    if (source === "osm_parking") return t("verifier.sourceOsm");
    if (source === "cadastre_parcelle") return t("verifier.sourceCadastre");
    if (source === "manual") return t("verifier.sourceManual");
    return "—";
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <form onSubmit={onSubmit} className="card p-6">
          <label className="owner-tool-muted block text-sm font-medium">{t("verifier.addressLabel")}</label>
          <div className="relative mt-2">
            <input
              className="input w-full"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setResult(null);
              }}
              placeholder={t("verifier.addressPlaceholder")}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className="verifier-suggestions absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border shadow-lg">
                {suggestions.map((f, i) => (
                  <li key={`${f.properties.label}-${i}`}>
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
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
            {loading ? t("verifier.searching") : t("verifier.submit")}
          </button>
        </form>

        {loading && (
          <p className="mt-4 text-sm text-slate-400" role="status">
            {t("verifier.loadingStatus")}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {result?.needsManualSurface && !result.surfaceM2 && (
          <form onSubmit={onManualSubmit} className="card mt-6 space-y-4 p-6">
            <p className="owner-tool-body text-sm">{t("verifier.manualLead")}</p>
            <input
              className="input"
              type="number"
              min={1}
              step={1}
              value={manualSurface}
              onChange={(e) => setManualSurface(e.target.value)}
              placeholder={t("verifier.surfacePlaceholder")}
              required
            />
            <button type="submit" className="btn-solar" disabled={loading}>
              {t("verifier.analyzeManual")}
            </button>
          </form>
        )}

        {result && result.surfaceM2 != null && (
          <div className="card mt-6 space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{t("verifier.resultAddress")}</p>
              <p className="owner-tool-heading mt-1 font-medium">{result.label}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Stat
                label={t("verifier.surfaceDetected")}
                value={`${nfSurface(result.surfaceM2)} m²`}
              />
              <Stat label={t("verifier.source")} value={surfaceSourceLabel(result.surfaceSource)} />
            </div>

            {result.surfaceNote && (
              <p className="text-xs text-amber-200/90">{result.surfaceNote}</p>
            )}

            <div
              className={`rounded-xl border px-4 py-3 ${
                result.eligibility === "concerned"
                  ? "border-solar/40 bg-solar/10 text-solar"
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              <p className="font-semibold">{eligibilityLabel(result.eligibility)}</p>
            </div>

            {result.deadline && (
              <p className="owner-tool-body text-sm">
                {fmt(t("verifier.deadlineApplicable"), {
                  ratio: result.deadline.ratio,
                  date: result.deadline.date,
                })}
                {result.deadline.note ? ` — ${result.deadline.note}` : null}
              </p>
            )}

            {result.fineLabel && (
              <p className="owner-tool-body text-sm">
                {t("verifier.potentialFine")}{" "}
                <strong className="owner-tool-heading">{result.fineLabel}</strong>
              </p>
            )}

            <DerogationBlock result={result} />

            {showDepositCta ? (
              <Link href={rfpHref()} className="btn-mint inline-flex w-full justify-center sm:w-auto">
                {t("verifier.getQuotes")}
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <RegulatoryCountdown variant="full" wave="large" theme="light" />
        <RegulatoryCountdown variant="full" wave="small" theme="light" />
        <p className="text-xs leading-relaxed text-slate-500">{t("verifier.disclaimer")}</p>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tool-stat rounded-xl border border-white/10 bg-night-900/50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="tool-stat-value owner-tool-heading mt-1 font-semibold">{value}</p>
    </div>
  );
}

function DerogationBlock({ result }: { result: VerifierResult }) {
  const t = useTranslations();
  const { derogations } = result;

  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <p className="owner-tool-body text-sm font-semibold">{t("verifier.derogTitle")}</p>

      {derogations.derogationPente && derogations.pentePct != null && (
        <p className="text-sm text-amber-100">
          ⚠️ {fmt(t("verifier.derogPente"), { pct: nf(derogations.pentePct) })}
        </p>
      )}

      {derogations.zoneAbf && (
        <p className="text-sm text-amber-100">⚠️ {t("verifier.derogAbf")}</p>
      )}

      {derogations.summary === "none" && (
        <p className="text-sm text-emerald-300">✅ {t("verifier.derogNone")}</p>
      )}

      <p className="text-xs text-slate-500">
        {fmt(t("verifier.derogFootnote"), { pct: PENTE_DEROGATION_PCT })}
      </p>
    </div>
  );
}
