-- Compteur admin : leads encore enrichissables via jointure MAJIC (lecture seule).
create or replace function count_leads_majic_joinable()
returns integer
language sql
stable
as $$
  select count(*)::integer
  from leads l
  inner join majic_proprietaires m on l.id_parcelle = m.id_parcelle
  where l.proprietaire_foncier is null;
$$;
