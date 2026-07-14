"use client";

import type { LeadTier } from "@/lib/types";
import { usePlausible } from "next-plausible";

export type SolarIndexEvents = {
  "Lead View": { tier: string; departement: string; flag: string };
  "Purchase Started": { tier: string; departement: string; prix: string };
  "Purchase Completed": { source: string; tier?: string };
};

export function useSolarAnalytics() {
  return usePlausible<SolarIndexEvents>();
}

export function trackLeadView(
  plausible: ReturnType<typeof useSolarAnalytics>,
  props: { tier: LeadTier; departement: string; flag: string },
) {
  plausible("Lead View", {
    props: {
      tier: props.tier,
      departement: props.departement,
      flag: props.flag,
    },
  });
}

export function trackPurchaseStarted(
  plausible: ReturnType<typeof useSolarAnalytics>,
  props: { tier: LeadTier; departement: string; prix: number },
) {
  plausible("Purchase Started", {
    props: {
      tier: props.tier,
      departement: props.departement,
      prix: String(props.prix),
    },
  });
}

export function trackPurchaseCompleted(
  plausible: ReturnType<typeof useSolarAnalytics>,
  props: { source: string; tier?: string },
) {
  plausible("Purchase Completed", {
    props: {
      source: props.source,
      ...(props.tier ? { tier: props.tier } : {}),
    },
  });
}
