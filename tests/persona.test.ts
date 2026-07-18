import { describe, expect, it } from "vitest";
import { isPersona, PERSONA_LABELS } from "@/lib/persona";

describe("persona", () => {
  it("valide les profils connus", () => {
    expect(isPersona("installer")).toBe(true);
    expect(isPersona("owner")).toBe(true);
    expect(isPersona("other")).toBe(false);
  });

  it("expose les libellés FR", () => {
    expect(PERSONA_LABELS.installer).toContain("Installateur");
    expect(PERSONA_LABELS.owner).toBe("Propriétaire");
  });
});
