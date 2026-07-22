import { describe, expect, it } from "vitest";
import { resolveLeadSolutionType } from "@/lib/solution-type";

describe("solution-type", () => {
  it("defaults leads to pv_pur", () => {
    expect(resolveLeadSolutionType({ type_solution_recherchee: "pv_pur" })).toBe("pv_pur");
  });

  it("infers mixte from Huwart coverage", () => {
    expect(
      resolveLeadSolutionType({
        pv_overlap_pct: 0.2,
        flag_urgence: "CONFORME_REQUIS",
      }),
    ).toBe("mixte_pv_vegetal");
  });
});
