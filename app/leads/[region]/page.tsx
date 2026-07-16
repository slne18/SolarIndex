import { notFound } from "next/navigation";
import LeadDetailClient from "../LeadDetailClient";
import SeoZonePage from "@/components/SeoZonePage";
import { buildZoneMetadata } from "@/lib/seo-metadata";
import {
  getSeoRegionSlugs,
  getSeoZoneLeads,
  getSeoZoneStats,
  SEO_REVALIDATE_SECONDS,
} from "@/lib/seo-leads";
import { isLeadUuid, regionFromSlug } from "@/lib/seo-zones";

export const revalidate = SEO_REVALIDATE_SECONDS;

export async function generateStaticParams() {
  const regions = await getSeoRegionSlugs();
  return regions.map((region) => ({ region }));
}

export async function generateMetadata({ params }: { params: { region: string } }) {
  if (isLeadUuid(params.region)) {
    return {
      title: "Fiche lead APER | SolarIndex",
      robots: { index: false, follow: false },
    };
  }
  const regionName = regionFromSlug(params.region);
  if (!regionName) return {};
  const stats = await getSeoZoneStats({ region: regionName });
  return buildZoneMetadata({
    region: regionName,
    stats,
    path: `/leads/${params.region}`,
  });
}

export default async function LeadsRegionPage({
  params,
}: {
  params: { region: string };
}) {
  if (isLeadUuid(params.region)) {
    return <LeadDetailClient id={params.region} />;
  }

  const regionName = regionFromSlug(params.region);
  if (!regionName) notFound();

  const [stats, leads] = await Promise.all([
    getSeoZoneStats({ region: regionName }),
    getSeoZoneLeads({ region: regionName }),
  ]);

  return (
    <SeoZonePage
      regionName={regionName}
      stats={stats}
      leads={leads}
      breadcrumb={[
        { label: "Leads", href: "/leads" },
        { label: regionName },
      ]}
    />
  );
}
