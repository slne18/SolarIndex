import { describe, it, expect } from "vitest";
import { PRIX_LEAD } from "@/lib/leads";
import {
  TERRITOIRE_LEADS_QUOTA,
  TERRITOIRE_PACK_DISCOUNT_PCT,
  TERRITOIRE_PACK_EUR,
  TERRITOIRE_PACK_REFERENCE_EUR,
} from "@/lib/subscription";

describe("pack territoire pricing", () => {
  it("5 leads à 500 € (−33 % vs 5 × Premium)", () => {
    expect(TERRITOIRE_LEADS_QUOTA).toBe(5);
    expect(TERRITOIRE_PACK_REFERENCE_EUR).toBe(5 * PRIX_LEAD.premium);
    expect(TERRITOIRE_PACK_EUR).toBe(500);
    expect(TERRITOIRE_PACK_DISCOUNT_PCT).toBe(33);
  });
});
