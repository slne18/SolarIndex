import { describe, expect, it } from "vitest";
import {
  APER_DEADLINE_50,
  APER_LAW_START,
  applicableAperDeadline,
  aperEligibilityStatus,
  countdownProgress,
  daysUntil,
} from "@/lib/aper-deadlines";
import { geodesicAreaM2 } from "@/lib/verifier/geo";

describe("aper-deadlines", () => {
  it("classifies eligibility", () => {
    expect(aperEligibilityStatus(null)).toBe("manual_required");
    expect(aperEligibilityStatus(1200)).toBe("below_threshold");
    expect(aperEligibilityStatus(2000)).toBe("concerned");
  });

  it("returns deadline by surface", () => {
    expect(applicableAperDeadline(12_000).date).toContain("2026");
    expect(applicableAperDeadline(3000).date).toContain("2027");
  });

  it("counts down days", () => {
    const d = daysUntil(APER_DEADLINE_50, new Date("2026-01-01T00:00:00Z"));
    expect(d).toBeGreaterThan(500);
  });

  it("progress between law start and deadline", () => {
    const p = countdownProgress(APER_LAW_START, APER_DEADLINE_50, new Date("2025-01-01T00:00:00Z"));
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(100);
  });
});

describe("geodesicAreaM2", () => {
  it("returns 0 for invalid polygon", () => {
    expect(geodesicAreaM2([])).toBe(0);
  });

  it("computes positive area for square-ish polygon", () => {
    // ~100m square near Toulouse
    const lon = 1.44;
    const lat = 43.6;
    const d = 0.00045;
    const coords: Array<[number, number]> = [
      [lon, lat],
      [lon + d, lat],
      [lon + d, lat + d],
      [lon, lat + d],
      [lon, lat],
    ];
    const area = geodesicAreaM2(coords);
    expect(area).toBeGreaterThan(1500);
    expect(area).toBeLessThan(25_000);
  });
});
