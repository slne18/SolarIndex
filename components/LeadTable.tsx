import Link from "next/link";
import type { PublicLead } from "@/lib/types";
import { eurosCompact, nf, scoreLabel } from "@/lib/format";
import LeadAvailabilityBadge from "@/components/LeadAvailabilityBadge";
import LeadTierBadge from "@/components/LeadTierBadge";
import LeadCompletenessBadge, { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
import { isLeadSlotOpen } from "@/lib/lead-slots";

function FlagBadge({ flag }: { flag: string }) {
  const urgence = flag === "URGENCE_ABSOLUE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        urgence ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"
      }`}
    >
      {urgence ? "🔴 Urgence" : "🟡 À équiper"}
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
  if (leads.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400">
        Aucun lead ne correspond à ces filtres.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="catalog-thead border-b text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Flag</th>
              <th className="px-4 py-3">Ville (Dépt)</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Signaux</th>
              <th className="px-4 py-3 text-right">Surface</th>
              <th className="px-4 py-3 text-right">kWc</th>
              <th className="px-4 py-3 text-right">Valeur chantier</th>
              <th className="px-4 py-3">NAF</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="catalog-tbody divide-y">
            {leads.map((lead) => (
              <tr key={lead.id} className="catalog-row transition">
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
                  <span className="ml-1 text-xs text-slate-500" title="Qualité des sources Open Data — voir fiche lead">
                    {scoreLabel(lead.score_confiance)}
                  </span>
                </td>
                <td className="px-4 py-3"><StatutCell lead={lead} /></td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/5"
                  >
                    Voir — {lead.prix_lead} €
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

export { FlagBadge };
