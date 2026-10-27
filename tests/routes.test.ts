import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LeadRow } from "@/lib/types";

// ─── Mocks de la couche d'accès données et auth ───────────────────────────────
vi.mock("@/lib/db", () => ({
  PAGE_SIZE: 20,
  queryLeads: vi.fn(),
  getLeadById: vi.fn(),
  getExistingByOsmIds: vi.fn(),
  upsertLeads: vi.fn(),
  userOwnsLead: vi.fn(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getUserIdFromRequest: vi.fn(),
  };
});

vi.mock("@/lib/catalog-access", () => ({
  getCatalogAccess: vi.fn().mockResolvedValue({
    needsOnboarding: false,
    departementLock: null,
    sampleRemaining: 0,
    sampleDepartement: null,
    subscriptionActive: false,
  }),
  canViewLeadDepartement: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/catalog-stats", () => ({
  getCatalogStats: vi.fn().mockResolvedValue({
    urgences_brut: 10,
    urgences_exclues_photo: 2,
    urgences_vendables: 8,
    urgences_ombriere_doute: 1,
    urgences_vision_done: 5,
    catalogue_total: 50,
  }),
}));

import * as db from "@/lib/db";
import * as auth from "@/lib/auth";
import { POST as ingestPOST } from "@/app/api/ingest/route";
import { GET as leadsGET } from "@/app/api/leads/route";
import { GET as leadGET } from "@/app/api/leads/[id]/route";

function makeLead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "uuid-1",
    created_at: "2026-01-01T00:00:00Z",
    osm_id: 123,
    osm_type: "way",
    latitude: 44.84,
    longitude: -0.68,
    departement: "33",
    region: "Nouvelle-Aquitaine",
    surface_m2: 22000,
    flag_urgence: "URGENCE_ABSOLUE",
    nom_osm: "Hyper",
    adresse: "1 rue X",
    ville: "Bordeaux",
    surface_solaire_m2: 11000,
    puissance_kwc: 2200,
    valeur_chantier_eur: 2640000,
    code_insee: "33063",
    id_parcelle: "33063000AB0042",
    siren: "395476312",
    raison_sociale: "Casino SAS",
    code_naf: "47.11F",
    libelle_naf: "Hypermarchés",
    dirigeant_nom: "M. X",
    dirigeant_exploitant: null,
    dirigeant_exploitant_qualite: null,
    dirigeant_proprietaire: null,
    dirigeant_proprietaire_qualite: null,
    telephone: "0102030405",
    telephone_exploitant: null,
    telephone_proprietaire: null,
    email_contact: "x@y.fr",
    pv_osm: false,
    pv_overlap_pct: null,
    pv_registry_count: null,
    detection: "libre",
    verified_at: null,
    surface_tag_present: true,
    surface_osm_m2: 12000,
    surface_cadastrale_m2: null,
    source_surface: "osm",
    proprietaire_foncier: null,
    siren_proprietaire_foncier: null,
    siren_date_creation: null,
    siren_etat_administratif: null,
    siren_anciennete_checked_at: null,
    vision_flag: false,
    vision_confidence: null,
    vision_checked_at: null,
    vision_surface_couverte_pct: null,
    vision_ortho_date: null,
    derogation_pente: false,
    derogation_abf: false,
    pente_pct: null,
    score_confiance: 0.87,
    type_solution_recherchee: "pv_pur",
    statut: "disponible",
    buyers_count: 0,
    acheteur_id: null,
    vendu_at: null,
    prix_vente_eur: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PIPELINE_INGEST_TOKEN = "secret-ingest";
  vi.mocked(db.userOwnsLead).mockResolvedValue(false);
});

// ─── POST /api/ingest ─────────────────────────────────────────────────────────
describe("POST /api/ingest", () => {
  it("refuse sans token valide (401)", async () => {
    const req = new Request("http://x/api/ingest", {
      method: "POST",
      headers: { Authorization: "Bearer mauvais" },
      body: JSON.stringify([{ osm_id: 1, surface_m2: 2000 }]),
    });
    const res = await ingestPOST(req);
    expect(res.status).toBe(401);
  });

  it("upsert + skip des leads déjà vendus, et compte correctement", async () => {
    vi.mocked(db.getExistingByOsmIds).mockResolvedValue([
      { osm_id: 200, statut: "vendu" }, // doit être ignoré
      { osm_id: 300, statut: "disponible" }, // doit être mis à jour
    ]);
    vi.mocked(db.upsertLeads).mockResolvedValue(undefined);

    const req = new Request("http://x/api/ingest", {
      method: "POST",
      headers: { Authorization: "Bearer secret-ingest" },
      body: JSON.stringify([
        { osm_id: 100, surface_m2: 12000, code_insee: "33063" }, // nouveau
        { osm_id: 200, surface_m2: 15000, code_insee: "33063" }, // vendu → skip
        { osm_id: 300, surface_m2: 3000, code_insee: "75056" }, // update
        { surface_m2: 9999 }, // sans osm_id → ignoré au mapping
      ]),
    });

    const res = await ingestPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ inserted: 1, updated: 1, skipped: 1 });

    // Vérifie que le lead vendu n'a PAS été envoyé à l'upsert
    const upserted = vi.mocked(db.upsertLeads).mock.calls[0][0] as Record<string, unknown>[];
    const ids = upserted.map((r) => r.osm_id);
    expect(ids).toContain(100);
    expect(ids).toContain(300);
    expect(ids).not.toContain(200);

    // Région dérivée du code INSEE
    const lead300 = upserted.find((r) => r.osm_id === 300);
    expect(lead300?.departement).toBe("75");
    expect(lead300?.region).toBe("Île-de-France");
  });

  it("400 si body vide", async () => {
    const req = new Request("http://x/api/ingest", {
      method: "POST",
      headers: { Authorization: "Bearer secret-ingest" },
      body: JSON.stringify([]),
    });
    const res = await ingestPOST(req);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/leads ───────────────────────────────────────────────────────────
describe("GET /api/leads", () => {
  it("200 sans authentification (catalogue public masqué)", async () => {
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue(null);
    vi.mocked(db.queryLeads).mockResolvedValue({ rows: [makeLead()], count: 1 });
    const res = await leadsGET(new Request("http://x/api/leads"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.leads[0].siren).toBeUndefined();
    expect(json.catalog.sampleRemaining).toBe(0);
  });

  it("masque les champs sensibles et renvoie la pagination", async () => {
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    vi.mocked(db.queryLeads).mockResolvedValue({
      rows: [makeLead(), makeLead({ id: "uuid-2", osm_id: 124 })],
      count: 2,
    });

    const req = new Request("http://x/api/leads?region=Nouvelle-Aquitaine&sort=valeur", {
      headers: { Authorization: "Bearer token" },
    });
    const res = await leadsGET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(2);
    expect(json.pageSize).toBe(20);
    expect(json.leads[0].siren).toBeUndefined();
    expect(json.leads[0].telephone).toBeUndefined();
    expect(json.leads[0].latitude).toBeUndefined();
    expect(json.leads[0].prix_lead).toBe(150);
  });

  it("transmet les filtres à queryLeads", async () => {
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    vi.mocked(db.queryLeads).mockResolvedValue({ rows: [], count: 0 });
    const req = new Request(
      "http://x/api/leads?departement=33&flag=URGENCE_ABSOLUE&surface_min=5000&naf=47.11F&page=2",
      { headers: { Authorization: "Bearer token" } },
    );
    await leadsGET(req);
    expect(db.queryLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        departement: "33",
        flag: "URGENCE_ABSOLUE",
        surfaceMin: 5000,
        naf: "47.11F",
        page: 2,
        sort: "valeur",
      }),
    );
  });

  it("transmet tier=premium et tier=standard", async () => {
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    vi.mocked(db.queryLeads).mockResolvedValue({ rows: [], count: 0 });
    await leadsGET(
      new Request("http://x/api/leads?tier=premium", {
        headers: { Authorization: "Bearer token" },
      }),
    );
    expect(db.queryLeads).toHaveBeenCalledWith(
      expect.objectContaining({ tierFilter: "premium" }),
    );
    await leadsGET(
      new Request("http://x/api/leads?tier=standard", {
        headers: { Authorization: "Bearer token" },
      }),
    );
    expect(db.queryLeads).toHaveBeenCalledWith(
      expect.objectContaining({ tierFilter: "standard" }),
    );
  });

  it("ignore un flag invalide", async () => {
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    vi.mocked(db.queryLeads).mockResolvedValue({ rows: [], count: 0 });
    const req = new Request("http://x/api/leads?flag=BIDON", {
      headers: { Authorization: "Bearer token" },
    });
    await leadsGET(req);
    expect(db.queryLeads).toHaveBeenCalledWith(
      expect.objectContaining({ flag: undefined }),
    );
  });
});

// ─── GET /api/leads/[id] ──────────────────────────────────────────────────────
describe("GET /api/leads/[id]", () => {
  it("404 si lead introuvable", async () => {
    vi.mocked(db.getLeadById).mockResolvedValue(null);
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    const res = await leadGET(new Request("http://x/api/leads/zzz"), {
      params: { id: "zzz" },
    });
    expect(res.status).toBe(404);
  });

  it("200 sans authentification pour un lead disponible (fiche masquée)", async () => {
    vi.mocked(db.getLeadById).mockResolvedValue(makeLead());
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue(null);
    const res = await leadGET(new Request("http://x/api/leads/uuid-1"), {
      params: { id: "uuid-1" },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.is_owned).toBe(false);
    expect(json.lead.siren).toBeUndefined();
    expect(json.catalog.sampleRemaining).toBe(0);
  });

  it("masque les champs sensibles pour un visiteur connecté non-acheteur", async () => {
    vi.mocked(db.getLeadById).mockResolvedValue(
      makeLead({ acheteur_id: "autre-user" }),
    );
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    const res = await leadGET(new Request("http://x/api/leads/uuid-1"), {
      params: { id: "uuid-1" },
    });
    const json = await res.json();
    expect(json.is_owned).toBe(false);
    expect(json.lead.siren).toBeUndefined();
    expect(json.lead.ville).toBe("Bordeaux");
  });

  it("404 pour un lead hors catalogue (statut complet)", async () => {
    vi.mocked(db.getLeadById).mockResolvedValue(
      makeLead({ statut: "complet", buyers_count: 12 }),
    );
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    const res = await leadGET(new Request("http://x/api/leads/uuid-1"), {
      params: { id: "uuid-1" },
    });
    expect(res.status).toBe(404);
  });

  it("visible même après d'autres achats (sans plafond)", async () => {
    vi.mocked(db.getLeadById).mockResolvedValue(
      makeLead({ buyers_count: 5, acheteur_id: "autre-user" }),
    );
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-1");
    const res = await leadGET(new Request("http://x/api/leads/uuid-1"), {
      params: { id: "uuid-1" },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.lead.buyers_count).toBe(5);
  });

  it("révèle tout pour l'acheteur du lead", async () => {
    vi.mocked(db.getLeadById).mockResolvedValue(
      makeLead({ buyers_count: 1, statut: "disponible" }),
    );
    vi.mocked(db.userOwnsLead).mockResolvedValue(true);
    vi.mocked(auth.getUserIdFromRequest).mockResolvedValue("user-42");
    const res = await leadGET(new Request("http://x/api/leads/uuid-1"), {
      params: { id: "uuid-1" },
    });
    const json = await res.json();
    expect(json.is_owned).toBe(true);
    expect(json.lead.siren).toBe("395476312");
    expect(json.lead.telephone).toBe("0102030405");
  });
});
