import { getAdminClient } from "./supabase";
import { baseCatalogCountQuery, countPremiumLeadsQuery } from "./catalog-stats";
import { premiumLeadCutoffIso } from "./platform-access";

export interface PricingStats {
  leads_total: number;
  leads_premium: number;
  leads_platform: number;
  leads_platform_pct: number;
  rfp_public: number;
  rfp_private: number;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export async function getPricingStats(): Promise<PricingStats> {
  const supabase = getAdminClient();
  const cutoff = premiumLeadCutoffIso();

  const [leadsTotalRes, leadsPremiumRes, rfpPublicRes, rfpPrivateRes] = await Promise.all([
    baseCatalogCountQuery(),
    countPremiumLeadsQuery(cutoff),
    supabase
      .from("rfp_submissions")
      .select("id", { count: "exact", head: true })
      .eq("statut", "publie")
      .eq("ao_publie_officiellement", true),
    supabase
      .from("rfp_submissions")
      .select("id", { count: "exact", head: true })
      .eq("statut", "publie")
      .eq("ao_publie_officiellement", false),
  ]);

  for (const res of [leadsTotalRes, leadsPremiumRes, rfpPublicRes, rfpPrivateRes]) {
    if (res.error) throw res.error;
  }

  const leads_total = leadsTotalRes.count ?? 0;
  const leads_premium = leadsPremiumRes.count ?? 0;
  const leads_platform = Math.max(0, leads_total - leads_premium);

  return {
    leads_total,
    leads_premium,
    leads_platform,
    leads_platform_pct: pct(leads_platform, leads_total),
    rfp_public: rfpPublicRes.count ?? 0,
    rfp_private: rfpPrivateRes.count ?? 0,
  };
}
