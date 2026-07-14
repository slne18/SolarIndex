-- Table de reference MAJIC DGFiP (parcelles personnes morales, open data)
-- Voir data.gouv.fr dataset fichiers des locaux et parcelles des personnes morales version unifiee

create table if not exists majic_proprietaires (
  id_parcelle text primary key,
  denomination text not null,
  siren text,
  forme_juridique text,
  forme_juridique_libelle text,
  millesime integer,
  loaded_at timestamptz not null default now()
);

create index if not exists majic_proprietaires_siren_idx on majic_proprietaires (siren);

-- Backfill leads.proprietaire_foncier par jointure locale (zéro API)
create or replace function backfill_proprietaire_from_majic()
returns integer
language sql
as $$
  with updated as (
    update leads l
    set
      proprietaire_foncier = m.denomination,
      siren_proprietaire_foncier = m.siren
    from majic_proprietaires m
    where l.id_parcelle = m.id_parcelle
      and l.proprietaire_foncier is null
    returning l.id
  )
  select count(*)::integer from updated;
$$;
