import { notFound } from "next/navigation";
import SeoZonePage from "@/components/SeoZonePage";
import { buildZoneMetadata } from "@/lib/seo-metadata";
import {
  getSeoDepartementParams,
  getSeoZoneLeads,
  getSeoZoneStats,
  SEO_REVALIDATE_SECONDS,
} from "@/lib/seo-leads";
import {
  departementFromSlug,
  isLeadUuid,
  regionFromSlug,
  regionToSlug,
} from "@/lib/seo-zones";

export const revalidate = SEO_REVALIDATE_SECONDS;

export async function generateStaticParams() {
  return getSeoDepartementParams();
}

export async function generateMetadata({
  params,
}: {
  params: { region: string; departement: string };
}) {
  if (isLeadUuid(params.region)) return {};

  const regionName = regionFromSlug(params.region);
  const dept = departementFromSlug(params.departement);
  if (!regionName || !dept) return {};

  const stats = await getSeoZoneStats({ region: regionName, departement: dept });
  return buildZoneMetadata({
    region: regionName,
    departement: dept,
    stats,
    path: `/leads/${params.region}/${params.departement}`,
  });
}

export default async function LeadsDepartementPage({
  params,
}: {
  params: { region: string; departement: string };
}) {
  if (isLeadUuid(params.region)) notFound();

  const regionName = regionFromSlug(params.region);
  const dept = departementFromSlug(params.departement);
  if (!regionName || !dept) notFound();

  const [stats, leads] = await Promise.all([
    getSeoZoneStats({ region: regionName, departement: dept }),
    getSeoZoneLeads({ region: regionName, departement: dept }),
  ]);

  return (
    <SeoZonePage
      regionName={regionName}
      departementCode={dept}
      stats={stats}
      leads={leads}
      breadcrumb={[
        { label: "Leads", href: "/leads" },
        { label: regionName, href: `/leads/${regionToSlug(regionName)}` },
        { label: `Dépt ${dept}` },
      ]}
    />
  );
}
