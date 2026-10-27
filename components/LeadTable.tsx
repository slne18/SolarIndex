"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { PRIX_PLATEFORME_MENSUEL, PRIX_PLATEFORME_PREMIER_MOIS } from "@/lib/platform-access";
import type { PublicLead } from "@/lib/types";
import { eurosCompact, nf } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import { scoreLevelKey } from "@/lib/i18n/leads-labels";
import { useTranslations } from "@/components/LocaleProvider";
import LeadTierBadge from "@/components/LeadTierBadge";
import { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
import { rememberLeadsCatalogReturn } from "@/lib/leads-catalog-return";

/** Badge catalogue : uniquement les urgences absolues (le reste = cas par défaut, sans pastille). */
export function FlagBadge({ flag }: { flag: string }) {
  const t = useTranslations();
  if (flag !== "URGENCE_ABSOLUE") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
      🔴 {t("leads.flag.urgence")}
    </span>
  );
}

export default function LeadTable({
  leads,
  ownedLeadIds = [],
}: {
  leads: PublicLead[];
  ownedLeadIds?: string[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const owned = useMemo(() => new Set(ownedLeadIds), [ownedLeadIds]);
  const [platformActive, setPlatformActive] = useState(false);
  const [subChecked, setSubChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setSubChecked(true);
        return;
      }
      try {
        const res = await fetch("/api/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPlatformActive(!!data.platform?.active);
        }
      } catch {
        /* ignore */
      } finally {
        setSubChecked(true);
      }
    })();
  }, []);

  function actionLabel(lead: PublicLead): string {
    if (owned.has(lead.id)) return t("leads.table.unlocked");
    if (lead.tier === "premium") {
      return fmt(t("leads.table.viewPremium"), { price: lead.prix_lead });
    }
    if (!subChecked) return t("common.loading");
    if (platformActive) return t("leads.table.unlock");
    return fmt(t("leads.table.subscribePlatform"), {
      intro: PRIX_PLATEFORME_PREMIER_MOIS,
      price: PRIX_PLATEFORME_MENSUEL,
    });
  }

  function actionClass(lead: PublicLead): string {
    const base = "catalog-table-action";
    if (owned.has(lead.id)) return `${base} font-semibold text-emerald-600`;
    if (lead.tier === "standard" && subChecked && platformActive) {
      return `${base} font-semibold text-solar`;
    }
    return base;
  }

  function openLead(id: string) {
    rememberLeadsCatalogReturn();
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
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/leads/${lead.id}`}
                    className={actionClass(lead)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actionLabel(lead)}
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
