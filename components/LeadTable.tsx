"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicLead } from "@/lib/types";
import { eurosCompact, nf } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import { scoreLevelKey } from "@/lib/i18n/leads-labels";
import { useTranslations } from "@/components/LocaleProvider";
import LeadAvailabilityBadge from "@/components/LeadAvailabilityBadge";
import LeadTierBadge from "@/components/LeadTierBadge";
import LeadCompletenessBadge, { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
import SolutionTypeBadge from "@/components/SolutionTypeBadge";
import { resolveLeadSolutionType } from "@/lib/solution-type";
import { isLeadSlotOpen } from "@/lib/lead-slots";

export function FlagBadge({ flag }: { flag: string }) {
  const t = useTranslations();
  const urgence = flag === "URGENCE_ABSOLUE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        urgence ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"
      }`}
    >
      {urgence ? `🔴 ${t("leads.flag.urgence")}` : `🟡 ${t("leads.flag.toEquip")}`}
    </span>
  );
}

function StatutCell({ lead }: { lead: PublicLead }) {
  const available = isLeadSlotOpen({
    buyers_count: lead.buyers_count ?? 0,
    statut: lead.statut,
  });
  return <LeadAvailabilityBadge available={available} />;
}

export default function LeadTable({ leads }: { leads: PublicLead[] }) {
  const t = useTranslations();
  const router = useRouter();

  function openLead(id: string) {
    router.push(`/leads/${id}`);
  }

  if (leads.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400">
        {t("leads.table.noResults")}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="catalog-thead border-b text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">{t("leads.table.flag")}</th>
              <th className="px-4 py-3">{t("leads.table.city")}</th>
              <th className="px-4 py-3">{t("leads.table.tier")}</th>
              <th className="px-4 py-3">{t("leads.table.signals")}</th>
              <th className="px-4 py-3 text-right">{t("leads.table.surface")}</th>
              <th className="px-4 py-3 text-right">{t("leads.table.kwc")}</th>
              <th className="px-4 py-3 text-right">{t("leads.table.projectValue")}</th>
              <th className="px-4 py-3">{t("leads.table.naf")}</th>
              <th className="px-4 py-3">{t("leads.table.score")}</th>
              <th className="px-4 py-3">{t("leads.table.status")}</th>
              <th className="px-4 py-3 text-right">{t("leads.table.action")}</th>
            </tr>
          </thead>
          <tbody className="catalog-tbody divide-y">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="catalog-row cursor-pointer transition hover:bg-white/[0.03]"
                onClick={() => openLead(lead.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLead(lead.id);
                  }
                }}
                tabIndex={0}
                role="link"
                aria-label={`${lead.ville || "Lead"} · ${lead.departement}`}
              >
                <td className="px-4 py-3">
                  <FlagBadge flag={lead.flag_urgence} />
                </td>
                <td className="px-4 py-3">
                  <div className="table-cell-title font-medium">{lead.ville || "—"}</div>
                  <div className="text-xs text-slate-500">{lead.departement}</div>
                </td>
                <td className="px-4 py-3">
                  <LeadTierBadge tier={lead.tier} compact />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {lead.has_dirigeant ? <LeadDirigeantBadge compact /> : null}
                    <LeadCompletenessBadge pct={lead.completude_pct} compact />
                    {resolveLeadSolutionType(lead) !== "pv_pur" ? (
                      <SolutionTypeBadge type={resolveLeadSolutionType(lead)} compact />
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{nf(lead.surface_m2)} m²</td>
                <td className="px-4 py-3 text-right tabular-nums">{nf(lead.puissance_kwc)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-solar">
                  {eurosCompact(lead.valeur_chantier_eur)}
                </td>
                <td className="px-4 py-3 text-slate-300">{lead.code_naf || "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-slate-300">{(lead.score_confiance ?? 0).toFixed(2)}</span>
                  <span className="ml-1 text-xs text-slate-500" title={t("leads.table.scoreTitle")}>
                    {t(scoreLevelKey(lead.score_confiance))}
                  </span>
                </td>
                <td className="px-4 py-3"><StatutCell lead={lead} /></td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {fmt(t("leads.table.view"), { price: lead.prix_lead })}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
