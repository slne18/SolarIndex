"use client";

import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { useSolarAnalytics, trackPurchaseStarted } from "@/lib/analytics";
import type { LeadTier } from "@/lib/types";

interface PurchaseButtonProps {
  leadId: string;
  prix: number;
  tier?: LeadTier;
  departement?: string;
  flag?: string;
  disabled?: boolean;
  disabledReason?: "sold_out" | "owned";
  full?: boolean;
}

export default function PurchaseButton({
  leadId,
  prix,
  tier = "standard",
  departement = "",
  flag = "",
  disabled,
  disabledReason = "sold_out",
  full,
}: PurchaseButtonProps) {
  const router = useRouter();
  const plausible = useSolarAnalytics();

  async function onClick() {
    trackPurchaseStarted(plausible, { tier, departement, prix });
    const token = await getAccessToken();
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent(`/checkout/${leadId}`)}`;
      return;
    }
    router.push(`/checkout/${leadId}`);
  }

  if (disabled) {
    const label =
      disabledReason === "owned" ? "Lead déjà acheté" : "Indisponible";
    return (
      <button disabled className={`btn cursor-not-allowed bg-white/10 text-slate-400 ${full ? "w-full" : ""}`}>
        {label}
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`btn-solar ${full ? "w-full" : ""}`}>
      {`Acheter ce lead — ${prix} €`}
    </button>
  );
}
