import { describe, it, expect } from "vitest";
import {
  resolveSurface,
  SURFACE_RATIO_MIN,
  SURFACE_RATIO_MAX,
} from "@/lib/surface-ratio";

describe("surface-ratio", () => {
  it("constantes 0.3–1.5", () => {
    expect(SURFACE_RATIO_MIN).toBe(0.3);
    expect(SURFACE_RATIO_MAX).toBe(1.5);
  });

  it("cadastre retenu dans la bande", () => {
    expect(resolveSurface(10_000, 12_000)).toEqual({
      surface: 12_000,
      source: "cadastre",
    });
  });

  it("osm si ratio > 1.5", () => {
    expect(resolveSurface(10_000, 20_000)).toEqual({
      surface: 10_000,
      source: "osm_fallback",
    });
  });

  it("osm si ratio < 0.3", () => {
    expect(resolveSurface(10_000, 2_000)).toEqual({
      surface: 10_000,
      source: "osm_fallback",
    });
  });

  it("osm si ratio 0.35 (accepté à 0.3)", () => {
    expect(resolveSurface(10_000, 3_500)).toEqual({
      surface: 3500,
      source: "cadastre",
    });
  });
});
