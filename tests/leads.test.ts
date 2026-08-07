import { describe, it, expect } from "vitest";
import {
  computePrixLead,
  computePrixLeadFromRow,
  leadTier,
  normalizeFlag,
  deptFromInsee,
  toPublicLead,
  toOwnedLead,
  mapPipelineToLead,
} from "@/lib/leads";
import { isLeadPremium } from "@/lib/lead-confidence";
import { getRegion } from "@/lib/regions";
import { LeadRow, SENSITIVE_FIELDS } from "@/lib/types";

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

describe("computePrixLead", () => {
  it("Premium : 150 € forfait", () => {
    expect(computePrixLead(5000, "premium")).toBe(150);
    expect(computePrixLead(50_000, "premium")).toBe(150);
  });
  it("Standard : 100 € forfait", () => {
    expect(computePrixLead(5000, "standard")).toBe(100);
    expect(computePrixLead(50_000, "standard")).toBe(100);
  });
});

describe("leadTier / isLeadPremium", () => {
  it("Premium si tous critères remplis", () => {
    const lead = makeLead({
      detection: "libre",
      surface_tag_present: true,
      source_surface: "cadastre",
      score_confiance: 0.85,
    });
    expect(isLeadPremium(lead)).toBe(true);
    expect(leadTier(lead)).toBe("premium");
    expect(computePrixLeadFromRow(lead)).toBe(150);
  });
  it("Standard si surface OSM seule", () => {
    const lead = makeLead({ source_surface: "osm", score_confiance: 0.9 });
    expect(isLeadPremium(lead)).toBe(false);
    expect(computePrixLeadFromRow(lead)).toBe(100);
  });
});

describe("normalizeFlag", () => {
  it("reconnaît l'emoji urgence du pipeline", () => {
    expect(normalizeFlag("🔴 URGENCE ABSOLUE", 20000)).toBe("URGENCE_ABSOLUE");
  });
  it("reconnaît le flag conforme", () => {
    expect(normalizeFlag("🟡 CONFORME REQUIS", 3000)).toBe("CONFORME_REQUIS");
  });
  it("retombe sur la surface si flag absent", () => {
    expect(normalizeFlag(undefined, 12_000)).toBe("URGENCE_ABSOLUE");
    expect(normalizeFlag(undefined, 11_100)).toBe("URGENCE_ABSOLUE");
    expect(normalizeFlag(undefined, 10_500)).toBe("CONFORME_REQUIS");
    expect(normalizeFlag(undefined, 2000)).toBe("CONFORME_REQUIS");
  });
  it("corrige urgence si surface dans la marge 10k–11k", () => {
    expect(normalizeFlag("🔴 URGENCE ABSOLUE", 10_800)).toBe("CONFORME_REQUIS");
  });
});

describe("deptFromInsee", () => {
  it("métropole", () => expect(deptFromInsee("33281")).toBe("33"));
  it("Corse", () => expect(deptFromInsee("2A004")).toBe("2A"));
  it("DROM", () => expect(deptFromInsee("97411")).toBe("974"));
  it("null si vide", () => expect(deptFromInsee(undefined)).toBeNull());
});

describe("getRegion", () => {
  it("mappe correctement", () => {
    expect(getRegion("33")).toBe("Nouvelle-Aquitaine");
    expect(getRegion("75")).toBe("Île-de-France");
    expect(getRegion("2B")).toBe("Corse");
  });
  it("null si inconnu", () => expect(getRegion("ZZ")).toBeNull());
});

describe("toPublicLead", () => {
  it("retire tous les champs sensibles et ajoute prix_lead", () => {
    const pub = toPublicLead(makeLead()) as Record<string, unknown>;
    for (const f of SENSITIVE_FIELDS) {
      expect(pub[f], `champ sensible ${f} ne doit pas fuiter`).toBeUndefined();
    }
    expect(pub.prix_lead).toBe(100);
    expect(pub.tier).toBe("standard");
    expect(pub.has_dirigeant).toBe(true);
    expect(pub.completude_pct).toBeGreaterThan(0);
    // Les champs publics restent présents
    expect(pub.ville).toBe("Bordeaux");
    expect(pub.valeur_chantier_eur).toBe(2640000);
  });
});

describe("toOwnedLead", () => {
  it("conserve les champs sensibles pour l'acheteur", () => {
    const owned = toOwnedLead(makeLead());
    expect(owned.siren).toBe("395476312");
    expect(owned.telephone).toBe("0102030405");
    expect(owned.prix_lead).toBe(100);
    expect(owned.tier).toBe("standard");
  });
});

describe("mapPipelineToLead", () => {
  it("transforme une ligne pipeline avec dérivation dept/region", () => {
    const row = mapPipelineToLead({
      osm_id: 999,
      osm_type: "way",
      latitude: 44.8,
      longitude: -0.6,
      surface_m2: 18000,
      flag_urgence: "🔴 URGENCE ABSOLUE",
      nom_osm: "Centre",
      adresse_cadastre: "2 av Y 33700 Mérignac",
      ville_osm: "Mérignac",
      surface_solaire_m2: 9000,
      puissance_kwc: 1800,
      valeur_chantier_eur: 2160000,
      code_insee: "33281",
      id_parcelle: "33281000ET0099",
      siren: "111222333",
      code_naf: "47.11F",
      geocode_score: 0.98,
    });
    expect(row.departement).toBe("33");
    expect(row.region).toBe("Nouvelle-Aquitaine");
    expect(row.flag_urgence).toBe("URGENCE_ABSOLUE");
    expect(row.adresse).toBe("2 av Y 33700 Mérignac");
    expect(row.statut).toBe("disponible");
    expect(row.score_confiance).toBe(0.98);
  });

  it("score_confiance par défaut à 0.5 si pas de geocode_score", () => {
    const row = mapPipelineToLead({ osm_id: 1, surface_m2: 2000 });
    expect(row.score_confiance).toBe(0.5);
    expect(row.flag_urgence).toBe("CONFORME_REQUIS");
  });
});
