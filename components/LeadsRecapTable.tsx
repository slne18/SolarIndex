"use client";

import { useEffect, useState } from "react";
import { eurosCompact, nf, nfSurface } from "@/lib/format";
import type { LeadsRecapResponse } from "@/lib/leads-recap-stats";

export default function LeadsRecapTable() {
  const [data, setData] = useState<LeadsRecapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/leads/recap-departements", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        setData(await res.json());
      } catch {
        setError(true);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="mt-4 text-sm text-slate-500">Chargement du récapitulatif…</p>;
  }

  if (error || !data) {
    return null;
  }

  const { totals, departements } = data;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Récapitulatif par département</h3>
          <p className="mt-1 max-w-3xl text-xs text-slate-500">
            Aligné sur le catalogue vendable · « Considéré comme équipé » = recouvrement OSM ≥ 50 %,
            grand parking avec photo &gt; 45 %, parkings sans SIREN ou parcelle cadastrale identifiable,
            ou en zone grise (1 500–1 600 m²).
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {nf(totals.catalogCount)} catalogue · {nf(totals.considereCommeEquipeCount)} considérés
          équipés
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Dép.</th>
              <th className="px-4 py-3">Catalogue</th>
              <th className="px-4 py-3">Considéré comme équipé</th>
              <th className="px-4 py-3">Surface catalogue (m²)</th>
              <th className="px-4 py-3">Pipeline catalogue</th>
            </tr>
          </thead>
          <tbody>
            {departements.map((d) => (
              <tr key={d.departement} className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium">{d.departement}</td>
                <td className="px-4 py-2">{nf(d.catalogCount)}</td>
                <td className="px-4 py-2">{nf(d.considereCommeEquipeCount)}</td>
                <td className="px-4 py-2">{nfSurface(d.surfaceM2)}</td>
                <td className="px-4 py-2">{eurosCompact(d.pipelineEur)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50/80 text-sm font-semibold">
            <tr>
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2">{nf(totals.catalogCount)}</td>
              <td className="px-4 py-2">{nf(totals.considereCommeEquipeCount)}</td>
              <td className="px-4 py-2">{nfSurface(totals.surfaceM2)}</td>
              <td className="px-4 py-2">{eurosCompact(totals.pipelineEur)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
