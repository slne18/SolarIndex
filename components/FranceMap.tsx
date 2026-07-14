"use client";

import { useEffect, useMemo, useState } from "react";
import franceMap from "@svg-maps/france.departments";
import type { DepartementStat } from "@/lib/departement-stats";
import { eurosCompact, nf } from "@/lib/format";

interface FranceMapProps {
  statsUrl: string;
  selectedDepartement?: string | null;
  onSelectDepartement: (code: string) => void;
  showUrgences?: boolean;
  /** "light" pour fond blanc (appels d'offres, catalogue leads). */
  theme?: "dark" | "light";
}

function deptFill(count: number, max: number, selected: boolean, light: boolean): string {
  if (selected) return "#f5b301";
  if (max <= 0 || count <= 0) {
    return light ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  }
  const t = Math.min(1, count / max);
  const r = Math.round(20 + t * 200);
  const g = Math.round(40 + t * 120);
  const b = Math.round(60 + t * 40);
  return `rgb(${r},${g},${b})`;
}

export default function FranceMap({
  statsUrl,
  selectedDepartement,
  onSelectDepartement,
  showUrgences = true,
  theme = "dark",
}: FranceMapProps) {
  const light = theme === "light";
  const [stats, setStats] = useState<DepartementStat[]>([]);
  const [maxTotal, setMaxTotal] = useState(0);
  const [hover, setHover] = useState<{ dept: string; name: string; x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await fetch(statsUrl);
        const data = await res.json();
        if (!res.ok) {
          setLoadError(true);
          setStats([]);
          setMaxTotal(0);
          return;
        }
        setStats(data.departements ?? []);
        setMaxTotal(data.max_total ?? 0);
      } catch {
        setLoadError(true);
        setStats([]);
        setMaxTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [statsUrl]);

  const byDept = useMemo(() => {
    const m = new Map<string, DepartementStat>();
    for (const s of stats) m.set(s.departement, s);
    return m;
  }, [stats]);

  return (
    <div className="relative">
      {loading ? (
        <p className={`py-8 text-center text-sm ${light ? "text-slate-500" : "text-slate-400"}`}>
          Chargement de la carte…
        </p>
      ) : (
        <>
          {loadError ? (
            <p className={`mb-3 text-center text-xs ${light ? "text-amber-700" : "text-amber-300/90"}`}>
              Statistiques indisponibles — carte affichée sans données.
            </p>
          ) : null}
          <svg
            viewBox={franceMap.viewBox}
            className="mx-auto w-full max-w-2xl"
            role="img"
            aria-label="Carte de France par département"
          >
            {franceMap.locations.map((loc) => {
              const stat = byDept.get(loc.id);
              const count = stat?.total ?? 0;
              const selected = selectedDepartement === loc.id;
              return (
                <path
                  key={loc.id}
                  d={loc.path}
                  fill={deptFill(count, maxTotal, selected, light)}
                  stroke={selected ? "#f5b301" : light ? "rgba(15,23,42,0.22)" : "rgba(255,255,255,0.25)"}
                  strokeWidth={selected ? 1.2 : 0.5}
                  className="cursor-pointer transition-colors hover:opacity-90"
                  onClick={() => onSelectDepartement(loc.id)}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget.closest("svg") as SVGSVGElement)?.getBoundingClientRect();
                    if (!rect) return;
                    setHover({
                      dept: loc.id,
                      name: loc.name,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </svg>
        </>
      )}

      {hover ? (
        <div
          className={`pointer-events-none absolute z-10 max-w-xs rounded-lg border px-3 py-2 text-xs shadow-xl ${
            light
              ? "border-slate-200 bg-white text-slate-800"
              : "border-white/15 bg-night-800/95 text-slate-200"
          }`}
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className={`font-semibold ${light ? "text-slate-900" : "text-white"}`}>
            {hover.name} ({hover.dept})
          </div>
          {(() => {
            const s = byDept.get(hover.dept);
            if (!s || s.total === 0) {
              return (
                <div className={`mt-1 ${light ? "text-slate-500" : "text-slate-400"}`}>
                  Aucune opportunité disponible
                </div>
              );
            }
            return (
              <div className={`mt-1 space-y-0.5 ${light ? "text-slate-600" : "text-slate-300"}`}>
                <div>{nf(s.total)} opportunités disponibles</div>
                {showUrgences ? <div>{nf(s.urgences)} en Urgence Absolue</div> : null}
                <div>Valeur pipeline estimée : {eurosCompact(s.pipeline_eur)}</div>
              </div>
            );
          })()}
        </div>
      ) : null}

      <div className={`mt-3 flex items-center justify-center gap-2 text-xs ${light ? "text-slate-500" : "text-slate-500"}`}>
        <span>Moins</span>
        <div
          className={`h-2 w-32 rounded-full bg-gradient-to-r ${
            light ? "from-slate-200 via-slate-400 to-solar" : "from-night-700 via-slate-600 to-solar"
          }`}
        />
        <span>Plus</span>
      </div>
    </div>
  );
}
