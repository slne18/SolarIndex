-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SolarIndex — Bypasses pipeline (5 améliorations)                           ║
-- ║  À exécuter dans le SQL Editor de Supabase.                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Bypass 1 : élargissement OSM (parking sans tag surface) ─────────────────
alter table leads add column if not exists surface_tag_present boolean default true;
alter table leads add column if not exists surface_osm_m2 numeric(10,1);

-- ─── Bypass 2 : surface cadastrale réelle ────────────────────────────────────
alter table leads add column if not exists surface_cadastrale_m2 numeric(10,1);
alter table leads add column if not exists source_surface text default 'osm';
-- 'osm' | 'cadastre' | 'osm_fallback'

-- ─── Bypass 3 : propriétaire foncier réel (chaîne capitalistique) ────────────
alter table leads add column if not exists siren_proprietaire text;
alter table leads add column if not exists raison_sociale_proprietaire text;
alter table leads add column if not exists type_entite text default 'inconnu';
-- 'exploitant_seul' | 'exploitant_et_proprietaire'
-- | 'exploitant_different_proprietaire' | 'holding_etrangere' | 'inconnu'

-- ─── Bypass 4 : validation vision ombrières ──────────────────────────────────
alter table leads add column if not exists vision_flag boolean default false;
alter table leads add column if not exists vision_confidence numeric(3,2);
alter table leads add column if not exists vision_checked_at timestamptz;

-- ─── Bypass 5 : dérogations APER (pente + zones ABF) ─────────────────────────
alter table leads add column if not exists derogation_pente boolean default false;
alter table leads add column if not exists derogation_abf boolean default false;
alter table leads add column if not exists pente_pct numeric(4,1);

create index if not exists leads_source_surface_idx on leads (source_surface);
