-- Retire type_proprietaire (redondant avec MAJIC = personnes morales uniquement)
-- Prerequis : migration 0013 (table majic_proprietaires) deja appliquee pour le backfill

drop index if exists leads_type_proprietaire_idx;
alter table leads drop column if exists type_proprietaire;
