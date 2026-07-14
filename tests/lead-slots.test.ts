import { describe, it, expect } from "vitest";
import {
  isLeadSlotOpen,
  leadAvailabilityLabel,
  MAX_BUYERS_PER_LEAD,
  remainingSlots,
} from "@/lib/lead-slots";

describe("lead-slots", () => {
  it("libellé disponibilité client", () => {
    expect(leadAvailabilityLabel(true)).toBe("Disponible");
    expect(leadAvailabilityLabel(false)).toBe("Indisponible");
  });

  it("slot ouvert tant que count < 3", () => {
    expect(isLeadSlotOpen({ buyers_count: 0, statut: "disponible" })).toBe(true);
    expect(isLeadSlotOpen({ buyers_count: 2, statut: "disponible" })).toBe(true);
    expect(isLeadSlotOpen({ buyers_count: 3, statut: "complet" })).toBe(false);
    expect(isLeadSlotOpen({ buyers_count: 2, statut: "complet" })).toBe(false);
  });

  it("places restantes", () => {
    expect(remainingSlots(0)).toBe(MAX_BUYERS_PER_LEAD);
    expect(remainingSlots(3)).toBe(0);
  });
});
