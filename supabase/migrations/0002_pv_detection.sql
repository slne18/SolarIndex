-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SolarIndex — Détection panneaux solaires existants (Signal A + B)          ║
-- ║  À exécuter dans le SQL Editor de Supabase après 0001_init.sql.             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Détection d'ombrières déjà installées, pour ne pas vendre un lead non pertinent.
--   detection = 'libre'      : aucun signe d'équipement (vendable, confiance haute)
--   detection = 'a_verifier' : recouvrement OSM partiel OU installation PV de
--                              puissance cohérente recensée dans la commune (ODRÉ)
--   detection = 'equipe'     : recouvrement OSM >= 50 % (déjà conforme → hors vente)
alter table leads add column if not exists pv_osm boolean default false;
alter table leads add column if not exists pv_overlap_pct numeric(4,3);
alter table leads add column if not exists pv_registry_count integer;
alter table leads add column if not exists detection text not null default 'libre';
alter table leads add column if not exists verified_at timestamptz;

-- Filtrage rapide des leads par état de détection.
create index if not exists leads_detection_idx on leads (detection);
