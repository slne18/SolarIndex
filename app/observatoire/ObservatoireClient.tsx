"use client";

import { useEffect, useMemo, useState } from "react";
import franceMap from "@svg-maps/france.departments";
import { eurosCompact, nf, nfSurface } from "@/lib/format";
import type { ObservatoireDeptStat, ObservatoireResponse } from "@/lib/observatoire-stats";

function deptFill(count: number, max: number): string {
  if (max <= 0 || count <= 0) return "#e2e8f0";
  const t = Math.min(1, count / max);
  const r = Math.round(20 + t * 200);
  const g = Math.round(40 + t * 120);
  const b = Math.round(60 + t * 40);
  return `rgb(${r},${g},${b})`;
}

export default function ObservatoireClient() {
  const [data, setData] = useState<ObservatoireResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<{ dept: string; x: number; y: number } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/observatoire/stats-departements");
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byDept = useMemo(() => {
    const m = new Map<string, ObservatoireDeptStat>();
    for (const d of data?.departements ?? []) m.set(d.departement, d);
    return m;
  }, [data]);

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement de l&apos;observatoire…</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-400">Données indisponibles.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Parkings ≥ 1 500 m²" value={nf(data.totals.count)} />
        <Kpi label="Surface totale" value={`${nfSurface(data.totals.surfaceM2)} m²`} />
        <Kpi label="Pipeline estimée" value={eurosCompact(data.totals.pipelineEur)} />
        <Kpi
          label="Déjà équipés (estim.)"
          value={
            data.totals.equippedPct != null ? `${data.totals.equippedPct} %` : "—"
          }
        />
      </div>

      <div className="relative rounded-2xl border border-slate-200 bg-white p-4">
        <svg viewBox={franceMap.viewBox} className="h-auto w-full max-h-[520px]">
          {franceMap.locations.map((loc) => {
            const dept = loc.id.replace("FR-", "");
            const stat = byDept.get(dept);
            const count = stat?.count ?? 0;
            return (
              <path
                key={loc.id}
                d={loc.path}
                fill={deptFill(count, data.max_count)}
                stroke="#fff"
                strokeWidth={0.5}
                className="cursor-pointer transition hover:opacity-80"
                onMouseEnter={(e) =>
                  setHover({ dept, x: e.clientX, y: e.clientY })
                }
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        {hover && byDept.get(hover.dept) && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
            <p className="font-bold text-slate-900">Dép. {hover.dept}</p>
            <p>{nf(byDept.get(hover.dept)!.count)} parkings</p>
            <p>{nfSurface(byDept.get(hover.dept)!.surfaceM2)} m²</p>
            <p>{eurosCompact(byDept.get(hover.dept)!.pipelineEur)}</p>
            {byDept.get(hover.dept)!.equippedPct != null && (
              <p>{byDept.get(hover.dept)!.equippedPct} % équipés</p>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Dép.</th>
              <th className="px-4 py-3">Parkings</th>
              <th className="px-4 py-3">Surface (m²)</th>
              <th className="px-4 py-3">Pipeline</th>
              <th className="px-4 py-3">Équipés</th>
            </tr>
          </thead>
          <tbody>
            {data.departements.slice(0, 20).map((d) => (
              <tr key={d.departement} className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium">{d.departement}</td>
                <td className="px-4 py-2">{nf(d.count)}</td>
                <td className="px-4 py-2">{nfSurface(d.surfaceM2)}</td>
                <td className="px-4 py-2">{eurosCompact(d.pipelineEur)}</td>
                <td className="px-4 py-2">
                  {d.equippedPct != null ? `${d.equippedPct} %` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
