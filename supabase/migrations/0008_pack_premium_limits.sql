-- Pack Territoire : plafonds Premium (2× urgence 250 €, 1× conforme 100 €).

alter table subscription_periods
  add column if not exists premium_urgence_consommes integer not null default 0,
  add column if not exists premium_conforme_consommes integer not null default 0;

comment on column subscription_periods.premium_urgence_consommes is
  'Premium urgence (> 11 000 m², 250 €) consommés sur ce pack (max 2).';
comment on column subscription_periods.premium_conforme_consommes is
  'Premium conforme (≤ 11 000 m², 100 €) consommés sur ce pack (max 1).';

create or replace function fulfill_subscription_lead(
  p_lead_id uuid,
  p_user_id uuid,
  p_period_id uuid,
  p_stripe_ref text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_quota int;
  v_consommes int;
  v_premium_urgence int;
  v_premium_conforme int;
  v_ref text;
  v_detection text;
  v_surface_tag boolean;
  v_source_surface text;
  v_score numeric;
  v_adresse text;
  v_siren text;
  v_id_parcelle text;
  v_surface_m2 numeric;
  v_is_premium boolean;
begin
  select quota_leads, leads_consommes, premium_urgence_consommes, premium_conforme_consommes
    into v_quota, v_consommes, v_premium_urgence, v_premium_conforme
  from subscription_periods
  where id = p_period_id
    and user_id = p_user_id
    and statut = 'active'
    and now() >= periode_debut
    and now() < periode_fin
  for update;

  if not found or v_consommes >= v_quota then
    return false;
  end if;

  select
    detection,
    surface_tag_present,
    source_surface,
    score_confiance,
    adresse,
    siren,
    id_parcelle,
    surface_m2
  into
    v_detection,
    v_surface_tag,
    v_source_surface,
    v_score,
    v_adresse,
    v_siren,
    v_id_parcelle,
    v_surface_m2
  from leads
  where id = p_lead_id;

  if not found then
    return false;
  end if;

  v_is_premium :=
    v_detection = 'libre'
    and coalesce(v_surface_tag, false)
    and v_source_surface = 'cadastre'
    and coalesce(v_score, 0) >= 0.8
    and btrim(coalesce(v_adresse, '')) <> ''
    and btrim(coalesce(v_siren, '')) <> ''
    and btrim(coalesce(v_id_parcelle, '')) <> '';

  if v_is_premium then
    if coalesce(v_surface_m2, 0) > 11000 then
      if v_premium_urgence >= 2 then
        return false;
      end if;
    elsif v_premium_conforme >= 1 then
      return false;
    end if;
  end if;

  v_ref := coalesce(p_stripe_ref, 'sub_' || p_period_id::text || '_' || p_lead_id::text);

  if not fulfill_lead_slot(p_lead_id, p_user_id, v_ref, 0, 'subscription') then
    return false;
  end if;

  update subscription_periods
  set
    leads_consommes = leads_consommes + 1,
    premium_urgence_consommes = premium_urgence_consommes + case
      when v_is_premium and coalesce(v_surface_m2, 0) > 11000 then 1
      else 0
    end,
    premium_conforme_consommes = premium_conforme_consommes + case
      when v_is_premium and coalesce(v_surface_m2, 0) <= 11000 then 1
      else 0
    end
  where id = p_period_id;

  return true;
end;
$fn$;
