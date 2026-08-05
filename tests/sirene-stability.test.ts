import { describe, expect, it } from "vitest";
import {
  hasSirenStabilityData,
  isSirenEntrepriseActive,
  sirenAncienneteAnnees,
} from "@/lib/sirene-stability";

describe("sirene-stability", () => {
  it("computes years since creation", () => {
    const years = sirenAncienneteAnnees("2010-06-15");
    expect(years).not.toBeNull();
    expect(years!).toBeGreaterThan(10);
  });

  it("detects active/inactive status", () => {
    expect(isSirenEntrepriseActive("A")).toBe(true);
    expect(isSirenEntrepriseActive("C")).toBe(false);
  });

  it("requires checked_at and date for display", () => {
    expect(
      hasSirenStabilityData({
        siren_date_creation: "2020-01-01",
        siren_anciennete_checked_at: "2026-01-01",
      }),
    ).toBe(true);
    expect(hasSirenStabilityData({ siren_date_creation: "2020-01-01" })).toBe(false);
  });
});
