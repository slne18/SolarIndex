import type { MessageKey } from "./locales/fr";

export function scoreLevelKey(score: number | null | undefined): MessageKey {
  const s = score ?? 0;
  if (s >= 0.8) return "leads.score.high";
  if (s >= 0.5) return "leads.score.medium";
  return "leads.score.low";
}

export function tierLabelKey(tier: "premium" | "standard"): MessageKey {
  return tier === "premium" ? "leads.tier.premium" : "leads.tier.standard";
}

export type ConfidenceFactorId =
  | "solar"
  | "aper_conformity"
  | "surfacing"
  | "cadastral"
  | "siren_stability"
  | "completeness"
  | "regulatory"
  | "registry";

export function confidenceFactorLabelKey(id: ConfidenceFactorId): MessageKey {
  const map: Record<ConfidenceFactorId, MessageKey> = {
    solar: "leads.confidence.solar",
    aper_conformity: "leads.confidence.aperConformity",
    surfacing: "leads.confidence.surfacing",
    cadastral: "leads.confidence.cadastral",
    siren_stability: "leads.confidence.sirenStability",
    completeness: "leads.confidence.completeness",
    regulatory: "leads.confidence.regulatory",
    registry: "leads.confidence.registry",
  };
  return map[id];
}
