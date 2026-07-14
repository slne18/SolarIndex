import { describe, it, expect } from "vitest";
import { leadsToCsv, ADMIN_LEAD_CSV_COLUMNS } from "@/lib/admin-csv";
import { isAdminAuthorized } from "@/lib/admin-auth";
import type { LeadRow } from "@/lib/types";

describe("admin-csv", () => {
  it("exporte toutes les colonnes avec BOM UTF-8", () => {
    const row = {
      id: "abc",
      siren: "123456789",
      raison_sociale: 'Test "SARL"',
      buyers_count: 2,
    } as LeadRow;
    const csv = leadsToCsv([row]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("buyers_count");
    expect(csv).toContain('"Test ""SARL"""');
    expect(ADMIN_LEAD_CSV_COLUMNS.length).toBeGreaterThan(40);
  });
});

describe("admin-auth", () => {
  it("refuse sans token", () => {
    const req = new Request("http://localhost/api/admin/dashboard");
    expect(isAdminAuthorized(req)).toBe(false);
  });

  it("accepte le bon bearer", () => {
    const prev = process.env.ADMIN_SECRET_TOKEN;
    process.env.ADMIN_SECRET_TOKEN = "secret-test";
    const req = new Request("http://localhost/api/admin/dashboard", {
      headers: { Authorization: "Bearer secret-test" },
    });
    expect(isAdminAuthorized(req)).toBe(true);
    process.env.ADMIN_SECRET_TOKEN = prev;
  });
});
