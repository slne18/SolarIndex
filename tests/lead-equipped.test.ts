import { describe, expect, it } from "vitest";
import { isConsidereCommeEquipeLead } from "@/lib/lead-equipped";

describe("isConsidereCommeEquipeLead", () => {
  it("detects pipeline equipe", () => {
    expect(isConsidereCommeEquipeLead({ detection: "equipe" })).toBe(true);
  });

  it("detects OSM overlap ≥ 50 %", () => {
    expect(
      isConsidereCommeEquipeLead({ detection: "libre", pv_overlap_pct: 0.52 }),
    ).toBe(true);
  });

  it("detects large parking with vision > 45 %", () => {
    expect(
      isConsidereCommeEquipeLead({
        detection: "libre",
        surface_m2: 12_000,
        vision_surface_couverte_pct: 46,
      }),
    ).toBe(true);
  });

  it("ignores vision > 45 % under 10 000 m²", () => {
    expect(
      isConsidereCommeEquipeLead({
        detection: "libre",
        surface_m2: 5_000,
        vision_surface_couverte_pct: 60,
      }),
    ).toBe(false);
  });
});
