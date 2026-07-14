import type { LeadTier } from "@/lib/types";
import { tierLabel, tierShortDescription } from "@/lib/lead-confidence";

export default function LeadTierBadge({
  tier,
  compact = false,
}: {
  tier: LeadTier;
  compact?: boolean;
}) {
  const premium = tier === "premium";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        premium
          ? "bg-solar/15 text-solar ring-1 ring-solar/30"
          : "bg-white/10 text-slate-300"
      }`}
      title={tierShortDescription(tier)}
    >
      {premium ? "★" : "○"} {tierLabel(tier)}
      {!compact && premium && <span className="hidden sm:inline">· vérifié</span>}
    </span>
  );
}
