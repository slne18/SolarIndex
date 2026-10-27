-- Leads automatisés : plus de plafond d'acheteurs (buyers_count = statistique uniquement).

comment on column leads.buyers_count is
  'Nombre d''installateurs ayant débloqué ce lead (sans plafond).';

update leads
set statut = 'disponible'
where statut = 'complet';

create or replace function fulfill_lead_slot(
  p_lead_id uuid,
  p_user_id uuid,
  p_stripe_ref text,
  p_montant_eur integer default 0,
  p_purchase_type text default 'unit'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_dummy int;
  v_updated int;
begin
  select 1 into v_dummy
  from leads
  where id = p_lead_id
  for update;

  if not found then
    return false;
  end if;

  if exists (
    select 1 from purchases
    where lead_id = p_lead_id and user_id = p_user_id and statut = 'paid'
  ) then
    return false;
  end if;

  insert into purchases (
    lead_id, user_id, stripe_session_id, montant_eur, statut, lead_delivered_at, purchase_type
  ) values (
    p_lead_id, p_user_id, p_stripe_ref, p_montant_eur, 'paid', now(), p_purchase_type
  )
  on conflict (stripe_session_id) do nothing;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    if exists (
      select 1 from purchases
      where stripe_session_id = p_stripe_ref and statut = 'paid'
    ) then
      return true;
    end if;
    return false;
  end if;

  update leads
  set
    buyers_count = buyers_count + 1,
    statut = 'disponible',
    vendu_at = coalesce(vendu_at, now()),
    prix_vente_eur = case when p_montant_eur > 0 then p_montant_eur else prix_vente_eur end
  where id = p_lead_id;

  return true;
end;
$fn$;

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
