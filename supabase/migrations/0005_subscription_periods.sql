-- Pack Territoire : quota mensuel de leads inclus (option 1).
-- Migration additive uniquement (pas de DROP) — sûre à relancer.

alter table purchases
  add column if not exists purchase_type text default 'unit';

create table if not exists subscription_periods (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz default now(),
  user_id                 uuid references auth.users(id) not null,
  stripe_subscription_id  text not null,
  quota_leads             integer not null default 10,
  leads_consommes         integer not null default 0,
  periode_debut           timestamptz not null,
  periode_fin             timestamptz not null,
  statut                  text not null default 'active'
);

create index if not exists subscription_periods_user_active_idx
  on subscription_periods (user_id, statut, periode_fin desc);

create unique index if not exists subscription_periods_stripe_period_uidx
  on subscription_periods (stripe_subscription_id, periode_debut);

alter table subscription_periods enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_periods'
      and policyname = 'Subscription periods visibles par le propriétaire'
  ) then
    create policy "Subscription periods visibles par le propriétaire"
      on subscription_periods for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Rédemption atomique : 1 crédit abo + marquer le lead vendu.
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fulfill_subscription_lead'
      and pg_get_function_identity_arguments(p.oid) =
          'p_lead_id uuid, p_user_id uuid, p_period_id uuid, p_stripe_ref text'
  ) then
    create function fulfill_subscription_lead(
      p_lead_id uuid,
      p_user_id uuid,
      p_period_id uuid,
      p_stripe_ref text
    )
    returns boolean
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    declare
      v_quota int;
      v_consommes int;
      v_updated int;
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

      update leads
      set statut = 'vendu',
          acheteur_id = p_user_id,
          vendu_at = now(),
          prix_vente_eur = 0
      where id = p_lead_id
        and statut = 'disponible';

      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        return false;
      end if;

      update subscription_periods
      set leads_consommes = leads_consommes + 1
      where id = p_period_id;

      insert into purchases (
        lead_id, user_id, stripe_session_id, montant_eur, statut, lead_delivered_at, purchase_type
      ) values (
        p_lead_id, p_user_id, p_stripe_ref, 0, 'paid', now(), 'subscription'
      )
      on conflict (stripe_session_id) do nothing;

      return true;
    end;
    $fn$;
  end if;
end $$;
