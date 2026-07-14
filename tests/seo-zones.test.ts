import { describe, it, expect } from "vitest";
import {
  ALL_REGIONS,
  departementFromSlug,
  departementToSlug,
  isLeadUuid,
  regionFromSlug,
  regionToSlug,
} from "@/lib/seo-zones";

describe("seo-zones", () => {
  it("convertit région ↔ slug", () => {
    expect(regionToSlug("Occitanie")).toBe("occitanie");
    expect(regionFromSlug("occitanie")).toBe("Occitanie");
    expect(regionFromSlug("inconnue")).toBeNull();
  });

  it("détecte les UUID lead", () => {
    expect(isLeadUuid("c7fa4bc7-3753-41f8-ac71-a40b3de5f086")).toBe(true);
    expect(isLeadUuid("occitanie")).toBe(false);
  });

  it("normalise les slugs département", () => {
    expect(departementFromSlug("31")).toBe("31");
    expect(departementFromSlug("2a")).toBe("2A");
    expect(departementToSlug("2A")).toBe("2a");
  });

  it("liste les régions uniques", () => {
    expect(ALL_REGIONS.length).toBeGreaterThan(10);
    expect(ALL_REGIONS).toContain("Occitanie");
  });
});
