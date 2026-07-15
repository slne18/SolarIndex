import Link from "next/link";
import { eurosCompact, nf } from "@/lib/format";
import type { SeoLeadPreview, SeoZoneStats } from "@/lib/seo-leads";
import { departementToSlug, getDepartmentsForRegion, regionToSlug } from "@/lib/seo-zones";
import LeadTierBadge from "@/components/LeadTierBadge";
import { FlagBadge } from "@/components/LeadTable";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo-config";

interface SeoZonePageProps {
  regionName: string;
  departementCode?: string | null;
  stats: SeoZoneStats;
  leads: SeoLeadPreview[];
  breadcrumb: { label: string; href?: string }[];
}

export default function SeoZonePage({
  regionName,
  departementCode,
  stats,
  leads,
  breadcrumb,
}: SeoZonePageProps) {
  const zoneTitle = departementCode
    ? `Département ${departementCode} · ${regionName}`
    : regionName;
  const deptLinks =
    !departementCode ? getDepartmentsForRegion(regionName) : [];
  const pagePath =
    breadcrumb[breadcrumb.length - 1]?.href ??
    (departementCode
      ? `/leads/${regionToSlug(regionName)}/${departementToSlug(departementCode)}`
      : `/leads/${regionToSlug(regionName)}`);

  return (
    <div className="container-x py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumb.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.label,
              ...(item.href ? { item: absoluteUrl(item.href) } : {}),
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Leads parking loi APER — ${zoneTitle}`,
            description: `${stats.leadCount} parkings non conformes identifiés en ${zoneTitle}.`,
            url: absoluteUrl(pagePath),
            inLanguage: "fr-FR",
          },
        ]}
      />
      <nav className="text-sm text-slate-400" aria-label="Fil d'Ariane">
        {breadcrumb.map((item, i) => (
          <span key={item.label}>
            {i > 0 && " · "}
            {item.href ? (
              <Link href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-300">{item.label}</span>
            )}
          </span>
        ))}
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Leads parking loi APER — {zoneTitle}
      </h1>
      <p className="mt-3 max-w-3xl text-slate-400">
        Parkings soumis à l&apos;obligation d&apos;ombrières photovoltaïques (loi APER),
        identifiés et qualifiés pour la prospection B2B installateurs en{" "}
        <strong className="text-slate-200">{zoneTitle}</strong>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatBox label="Leads disponibles" value={nf(stats.leadCount)} />
        <StatBox label="Surface totale" value={`${nf(stats.totalSurfaceM2)} m²`} />
        <StatBox label="Valeur commerciale" value={eurosCompact(stats.totalValeurEur)} />
      </div>

      {!departementCode && deptLinks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Par département
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {deptLinks.map((dept) => (
              <Link
                key={dept}
                href={`/leads/${regionToSlug(regionName)}/${departementToSlug(dept)}`}
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-slate-200 hover:bg-white/5"
              >
                {dept}
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Leads disponibles</h2>
      <p className="mt-1 text-sm text-slate-400">
        Aperçu public — identité entreprise débloquée après achat.
      </p>

      {leads.length === 0 ? (
        <p className="mt-6 text-slate-400">Aucun lead disponible pour cette zone actuellement.</p>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 bg-night-700/40 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Dépt</th>
                  <th className="px-4 py-3 text-right">Surface</th>
                  <th className="px-4 py-3 text-right">kWc</th>
                  <th className="px-4 py-3 text-right">Valeur</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3 text-right">Prix</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{lead.ville || "—"}</div>
                      <div className="mt-1">
                        <FlagBadge flag={lead.flag_urgence} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{lead.departement}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf(lead.surface_m2)} m²</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nf(lead.puissance_kwc)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-solar">
                      {eurosCompact(lead.valeur_chantier_eur)}
                    </td>
                    <td className="px-4 py-3">
                      <LeadTierBadge tier={lead.tier} compact />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {lead.prix_lead} €
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
                      >
                        Voir la fiche
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/leads" className="btn-solar">
          Tous les leads
        </Link>
        <Link href="/login?mode=signup&next=/leads" className="btn-ghost">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}
