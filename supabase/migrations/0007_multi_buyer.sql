-- Modèle hybride : jusqu'à 3 acheteurs par lead (plus d'exclusivité).

alter table leads
  add column if not exists buyers_count integer not null default 0;

comment on column leads.buyers_count is 'Nombre d''acheteurs ayant débloqué ce lead (max 3).';

-- Un utilisateur ne peut acheter qu''une fois le même lead.
create unique index if not exists purchases_lead_user_paid_uidx
  on purchases (lead_id, user_id)
  where statut = 'paid';

-- Backfill depuis les achats existants.
update leads l
set buyers_count = sub.cnt
from (
  select lead_id, count(*)::int as cnt
  from purchases
  where statut = 'paid'
  group by lead_id
) sub
where l.id = sub.lead_id;

-- Leads marqués vendus sans ligne purchase (legacy exclusif).
update leads
set buyers_count = greatest(buyers_count, 1)
where statut = 'vendu' and buyers_count = 0;

-- Statut : complet si 3 acheteurs, sinon disponible.
update leads
set statut = case
  when buyers_count >= 3 then 'complet'
  else 'disponible'
end
where statut in ('vendu', 'disponible');

-- Réserve un slot d'achat (atomique).
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
  v_count int;
  v_updated int;
begin
  select buyers_count into v_count
  from leads
  where id = p_lead_id
  for update;

  if not found or v_count >= 3 then
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
    statut = case when buyers_count + 1 >= 3 then 'complet' else 'disponible' end,
    vendu_at = coalesce(vendu_at, now()),
    prix_vente_eur = case when p_montant_eur > 0 then p_montant_eur else prix_vente_eur end
  where id = p_lead_id;

  return true;
end;
$fn$;

-- Abonnement : quota + slot hybride.
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
  v_ref text;
begin
  select quota_leads, leads_consommes
    into v_quota, v_consommes
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

  v_ref := coalesce(p_stripe_ref, 'sub_' || p_period_id::text || '_' || p_lead_id::text);

  if not fulfill_lead_slot(p_lead_id, p_user_id, v_ref, 0, 'subscription') then
    return false;
  end if;

  update subscription_periods
  set leads_consommes = leads_consommes + 1
  where id = p_period_id;

  return true;
end;
$fn$;

-- Échantillon : département + quota + slot hybride.
create or replace function fulfill_sample_lead(
  p_lead_id uuid,
  p_user_id uuid,
  p_stripe_ref text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_remaining int;
  v_dept text;
  v_lead_dept text;
  v_ref text;
begin
  select sample_leads_remaining, sample_departement
    into v_remaining, v_dept
  from profiles
  where id = p_user_id
  for update;

  if not found or v_remaining is null or v_remaining <= 0 or v_dept is null then
    return false;
  end if;

  select departement into v_lead_dept from leads where id = p_lead_id;
  if v_lead_dept is null or v_lead_dept <> v_dept then
    return false;
  end if;

  v_ref := coalesce(p_stripe_ref, 'sample_' || p_user_id::text || '_' || p_lead_id::text);

  if not fulfill_lead_slot(p_lead_id, p_user_id, v_ref, 0, 'sample') then
    return false;
  end if;

  update profiles
  set sample_leads_remaining = sample_leads_remaining - 1
  where id = p_user_id;

  return true;
end;
$fn$;
