-- Abonnement Accès plateforme (300 €/mois) — accès catalogue hors premium + AO publics.

create table if not exists platform_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz default now(),
  user_id                 uuid references auth.users(id) not null,
  stripe_subscription_id  text not null,
  statut                  text not null default 'active',
  periode_debut           timestamptz not null,
  periode_fin             timestamptz not null
);

create unique index if not exists platform_subscriptions_stripe_uidx
  on platform_subscriptions (stripe_subscription_id);

create index if not exists platform_subscriptions_user_active_idx
  on platform_subscriptions (user_id, statut, periode_fin desc);

alter table platform_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_subscriptions'
      and policyname = 'Platform subscriptions visibles par le propriétaire'
  ) then
    create policy "Platform subscriptions visibles par le propriétaire"
      on platform_subscriptions for select
      using (auth.uid() = user_id);
  end if;
end $$;
