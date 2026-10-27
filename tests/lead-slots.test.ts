import { describe, it, expect } from "vitest";
import { isLeadSlotOpen } from "@/lib/lead-slots";

describe("lead-slots", () => {
  it("ouvert uniquement si statut disponible", () => {
    expect(isLeadSlotOpen({ statut: "disponible" })).toBe(true);
    expect(isLeadSlotOpen({ statut: "complet" })).toBe(false);
    expect(isLeadSlotOpen({ statut: "vendu" })).toBe(false);
    expect(isLeadSlotOpen({ statut: "expiré" })).toBe(false);
  });
});
