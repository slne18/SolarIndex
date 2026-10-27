// Représentation d'un lead telle que stockée dans Supabase (table `leads`).
import type { TypeSolutionRecherchee } from "./solution-type";

export interface LeadRow {
  id: string;
  created_at: string;

  // Géographie
  osm_id: number;
  osm_type: string | null;
  latitude: number;
  longitude: number;
  departement: string;
  region: string | null;

  // Données parking
  surface_m2: number;
  flag_urgence: FlagUrgence;
  nom_osm: string | null;
  adresse: string | null;
  ville: string | null;

  // Potentiel solaire
  surface_solaire_m2: number | null;
  puissance_kwc: number | null;
  valeur_chantier_eur: number | null;

  // Enrichissement B2B
  code_insee: string | null;
  id_parcelle: string | null;
  siren: string | null;
  raison_sociale: string | null;
  code_naf: string | null;
  libelle_naf: string | null;
  dirigeant_nom: string | null;
  dirigeant_exploitant: string | null;
  dirigeant_exploitant_qualite: string | null;
  dirigeant_proprietaire: string | null;
  dirigeant_proprietaire_qualite: string | null;
  telephone: string | null;
  telephone_exploitant: string | null;
  telephone_proprietaire: string | null;
  email_contact: string | null;

  // Détection panneaux solaires existants (Signal A : OSM, Signal B : registre ODRÉ)
  pv_osm: boolean | null;
  pv_overlap_pct: number | null;
  pv_registry_count: number | null;
  detection: DetectionEtat;
  verified_at: string | null;

  // Bypass 1 & 2 : provenance de la surface retenue
  surface_tag_present: boolean | null;
  surface_osm_m2: number | null;
  surface_cadastrale_m2: number | null;
  source_surface: SourceSurface | null;

  // Bypass 3 : propriétaire foncier (MAJIC DGFiP)
  proprietaire_foncier: string | null;
  siren_proprietaire_foncier: string | null;

  /** Stabilité exploitant (API SIRENE). */
  siren_date_creation: string | null;
  siren_etat_administratif: string | null;
  siren_anciennete_checked_at: string | null;

  // Bypass 4 : validation vision ombrières
  vision_flag: boolean | null;
  vision_confidence: number | null;
  vision_checked_at: string | null;
  /** Part couverte estimée sur orthophoto (0–100). */
  vision_surface_couverte_pct: number | null;
  /** Date de vol orthophoto IGN analysée (YYYY-MM-DD). */
  vision_ortho_date: string | null;

  // Bypass 5 : dérogations APER potentielles
  derogation_pente: boolean | null;
  derogation_abf: boolean | null;
  pente_pct: number | null;

  // Confiance & statut commercial
  score_confiance: number;
  /** Solution recherchée : PV pur, mix Huwart, ou végétalisation (toiture). */
  type_solution_recherchee: TypeSolutionRecherchee;
  statut: LeadStatut;
  buyers_count: number;
  acheteur_id: string | null;
  vendu_at: string | null;
  prix_vente_eur: number | null;
}

export type FlagUrgence = "URGENCE_ABSOLUE" | "CONFORME_REQUIS";
export type LeadStatut = "disponible" | "vendu" | "complet" | "reserve" | "expiré";
export type LeadTier = "premium" | "standard";
// État de détection PV : libre (rien), a_verifier (doute), equipe (déjà conforme).
export type DetectionEtat = "libre" | "a_verifier" | "equipe";
// Provenance de la surface qui fait foi pour l'éligibilité APER.
export type SourceSurface = "osm" | "cadastre" | "osm_fallback";

// Lead "public" renvoyé par l'API (champs sensibles retirés, prix calculé).
export type PublicLead = Omit<LeadRow, (typeof SENSITIVE_FIELDS)[number]> & {
  tier: LeadTier;
  prix_lead: number;
  isOwned?: boolean;
  /** Dirigeant exploitant identifié (sans exposer le nom). */
  has_dirigeant: boolean;
  /** Complétude documentaire 0–100 (SIREN, parcelle, dirigeants…). */
  completude_pct: number;
};

// Champs sensibles : jamais exposés sauf à l'acheteur du lead.
export const SENSITIVE_FIELDS = [
  "siren",
  "raison_sociale",
  "siren_proprietaire_foncier",
  "proprietaire_foncier",
  "dirigeant_nom",
  "dirigeant_exploitant",
  "dirigeant_exploitant_qualite",
  "dirigeant_proprietaire",
  "dirigeant_proprietaire_qualite",
  "telephone",
  "telephone_exploitant",
  "telephone_proprietaire",
  "email_contact",
  "adresse",
  "id_parcelle",
  "latitude",
  "longitude",
] as const;

// Format brut produit par le pipeline Python (clés du CSV / JSON d'ingestion).
export interface PipelineLead {
  osm_id: number;
  osm_type?: string;
  latitude?: number;
  longitude?: number;
  surface_m2: number;
  flag_urgence?: string;
  nom_osm?: string;
  operateur_osm?: string;
  adresse_osm?: string;
  ville_osm?: string;
  surface_solaire_m2?: number;
  puissance_kwc?: number;
  valeur_chantier_eur?: number;
  adresse_cadastre?: string;
  ville_ban?: string;
  code_insee?: string;
  geocode_score?: number;
  id_parcelle?: string;
  siren?: string;
  raison_sociale?: string;
  code_naf?: string;
  libelle_naf?: string;
  dirigeant_nom?: string;
  dirigeant_exploitant?: string;
  dirigeant_exploitant_qualite?: string;
  dirigeant_proprietaire?: string;
  dirigeant_proprietaire_qualite?: string;
  telephone?: string;
  telephone_exploitant?: string;
  telephone_proprietaire?: string;
  email_contact?: string;
  departement?: string;
  // Détection PV (présents uniquement si le pipeline a tourné avec --verify)
  pv_osm?: boolean;
  pv_overlap_pct?: number;
  pv_registry_count?: number;
  detection?: string;
  // Bypasses pipeline
  surface_tag_present?: boolean;
  surface_osm_m2?: number;
  surface_cadastrale_m2?: number;
  source_surface?: string;
  score_confiance?: number;
  siren_proprietaire_foncier?: string;
  proprietaire_foncier?: string;
  siren_date_creation?: string;
  siren_etat_administratif?: string;
  siren_anciennete_checked_at?: string;
  vision_flag?: boolean;
  vision_confidence?: number;
  vision_checked_at?: string;
  vision_surface_couverte_pct?: number;
  vision_ortho_date?: string;
  derogation_pente?: boolean;
  derogation_abf?: boolean;
  pente_pct?: number;
  type_solution_recherchee?: string;
}
