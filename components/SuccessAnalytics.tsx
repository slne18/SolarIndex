"use client";

import { useEffect } from "react";
import { useSolarAnalytics, trackPurchaseCompleted } from "@/lib/analytics";

export default function SuccessAnalytics({
  source,
}: {
  source: "pack_welcome" | "pack_redeem" | "stripe";
}) {
  const plausible = useSolarAnalytics();

  useEffect(() => {
    trackPurchaseCompleted(plausible, { source });
  }, [plausible, source]);

  return null;
}
