import { describe, expect, it } from "vitest";
import {
  APER_FINE_AT_OR_ABOVE_URGENCE_EUR,
  APER_FINE_BELOW_URGENCE_EUR,
  formatAperAnnualFine,
  maxAperAnnualFineEur,
} from "@/lib/aper-fine";

describe("aper-fine", () => {
  it("20 000 €/an en dessous de 10 000 m²", () => {
    expect(maxAperAnnualFineEur(1500)).toBe(APER_FINE_BELOW_URGENCE_EUR);
    expect(maxAperAnnualFineEur(9999)).toBe(APER_FINE_BELOW_URGENCE_EUR);
    expect(formatAperAnnualFine(5000)).toBe("20 000 €/an");
  });

  it("40 000 €/an à partir de 10 000 m²", () => {
    expect(maxAperAnnualFineEur(10000)).toBe(APER_FINE_AT_OR_ABOVE_URGENCE_EUR);
    expect(maxAperAnnualFineEur(22400)).toBe(APER_FINE_AT_OR_ABOVE_URGENCE_EUR);
    expect(formatAperAnnualFine(12000)).toBe("40 000 €/an");
  });
});
