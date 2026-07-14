import { describe, it, expect } from "vitest";
import { getDetectionStatus } from "@/lib/detection-status";

describe("detection-status", () => {
  it("explique vérifié pour un lead standard", () => {
    const s = getDetectionStatus({
      detection: "libre",
      flag_urgence: "CONFORME_REQUIS",
    });
    expect(s?.badge).toContain("Vérifié");
    expect(s?.detail).toContain("OpenStreetMap");
    expect(s?.disclaimer).toContain("automatique");
  });

  it("explique à vérifier pour une urgence", () => {
    const s = getDetectionStatus({
      detection: "a_verifier",
      flag_urgence: "URGENCE_ABSOLUE",
    });
    expect(s?.badge).toContain("vérifier");
    expect(s?.detail).toContain("photo aérienne");
  });

  it("ignore equipe", () => {
    expect(getDetectionStatus({ detection: "equipe", flag_urgence: "CONFORME_REQUIS" })).toBeNull();
  });
});
