"use client";

import { useEffect, useState } from "react";
import { eurosCompact, nf, nfSurface } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import { useTranslations } from "@/components/LocaleProvider";
import type { LeadsRecapResponse } from "@/lib/leads-recap-stats";

export default function LeadsRecapTable() {
  const t = useTranslations();
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
    return <p className="mt-4 text-sm text-slate-500">{t("leads.recap.loading")}</p>;
  }

  if (error || !data) {
    return null;
  }

  const { totals, departements } = data;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{t("leads.recap.title")}</h3>
          <p className="mt-1 max-w-3xl text-xs text-slate-500">{t("leads.recap.lead")}</p>
        </div>
        <p className="text-xs text-slate-500">
          {fmt(t("leads.recap.totals"), {
            catalog: nf(totals.catalogCount),
            equipped: nf(totals.considereCommeEquipeCount),
          })}
        </p>
      </div>

      <div className="leads-recap-scroll max-h-80 overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 bg-white sm:max-h-96">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
            <tr>
              <th className="px-4 py-3">{t("leads.recap.colDept")}</th>
              <th className="px-4 py-3">{t("leads.recap.colCatalog")}</th>
              <th className="px-4 py-3">{t("leads.recap.colEquipped")}</th>
              <th className="px-4 py-3">{t("leads.recap.colSurface")}</th>
              <th className="px-4 py-3">{t("leads.recap.colPipeline")}</th>
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
          <tfoot className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50 text-sm font-semibold shadow-[0_-1px_0_0_rgb(226_232_240)]">
            <tr>
              <td className="px-4 py-2">{t("leads.recap.total")}</td>
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
