-- Agrégations carte de France (évite la limite PostgREST 1000 lignes)

create or replace function public.lead_stats_par_departement()
returns table (
  departement text,
  total bigint,
  urgences bigint,
  pipeline_eur numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    departement,
    count(*)::bigint as total,
    count(*) filter (where flag_urgence = 'URGENCE_ABSOLUE')::bigint as urgences,
    coalesce(sum(valeur_chantier_eur), 0) as pipeline_eur
  from leads
  where statut = 'disponible'
    and buyers_count < 3
    and siren is not null
    and id_parcelle is not null
    and adresse is not null
    and adresse <> ''
    and detection <> 'equipe'
    and (vision_surface_couverte_pct is null or vision_surface_couverte_pct <= 45)
    and surface_m2 > 1600
    and departement is not null
  group by departement
  order by total desc;
$$;

create or replace function public.rfp_stats_par_departement()
returns table (
  departement text,
  total bigint,
  urgences bigint,
  pipeline_eur numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    departement,
    count(*)::bigint as total,
    0::bigint as urgences,
    coalesce(
      sum(round((coalesce(surface_estimee_m2, 0) * 0.5 / 5.0) * 1200)),
      0
    ) as pipeline_eur
  from rfp_submissions
  where statut = 'publie'
    and departement is not null
  group by departement
  order by total desc;
$$;

grant execute on function public.lead_stats_par_departement() to service_role;
grant execute on function public.rfp_stats_par_departement() to service_role;
