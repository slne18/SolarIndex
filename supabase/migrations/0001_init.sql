-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SolarIndex — Schéma initial (Phase A)                                      ║
-- ║  À exécuter dans le SQL Editor de Supabase (ou via `supabase db push`).     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Table leads ──────────────────────────────────────────────────────────────
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),

  -- Géographie
  osm_id        bigint unique not null,
  osm_type      text,
  latitude      numeric(9,6) not null,
  longitude     numeric(9,6) not null,
  departement   text not null,
  region        text,

  -- Données parking
  surface_m2    numeric(10,1) not null,
  flag_urgence  text not null,
  nom_osm       text,
  adresse       text,
  ville         text,

  -- Potentiel solaire
  surface_solaire_m2  numeric(10,1),
  puissance_kwc       numeric(10,1),
  valeur_chantier_eur numeric(12,0),

  -- Enrichissement B2B
  code_insee    text,
  id_parcelle   text,
  siren         text,
  raison_sociale text,
  code_naf      text,
  libelle_naf   text,
  dirigeant_nom text,
  telephone     text,
  email_contact text,

  -- Score de confiance (0.0 → 1.0)
  score_confiance numeric(3,2) default 0.5,

  -- Statut commercial
  statut        text not null default 'disponible',
  acheteur_id   uuid references auth.users(id),
  vendu_at      timestamptz,
  prix_vente_eur integer
);

create index if not exists leads_dept_statut_idx on leads (departement, statut);
create index if not exists leads_flag_statut_idx on leads (flag_urgence, statut);
create index if not exists leads_region_statut_idx on leads (region, statut);

-- ─── Table purchases ─────────────────────────────────────────────────────────
create table if not exists purchases (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  lead_id             uuid references leads(id) not null,
  user_id             uuid references auth.users(id) not null,
  stripe_session_id   text unique not null,
  stripe_payment_id   text,
  montant_eur         integer not null,
  statut              text default 'pending',
  lead_delivered_at   timestamptz
);

-- ─── Table profiles ──────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id),
  created_at      timestamptz default now(),
  email           text,
  entreprise      text,
  telephone       text,
  region_cible    text,
  departements    text[],
  plan            text default 'free',
  abonnement_actif boolean default false,
  stripe_customer_id text,
  leads_achetes   integer default 0,
  notes_admin     text
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- NB : les API Routes utilisent la clé service_role (bypass RLS) et masquent
-- les colonnes sensibles côté serveur. Ces policies protègent les accès directs.
alter table leads enable row level security;
drop policy if exists "Leads visibles publiquement (données partielles)" on leads;
create policy "Leads visibles publiquement (données partielles)"
  on leads for select using (true);

alter table purchases enable row level security;
drop policy if exists "Purchases visibles par l'acheteur" on purchases;
create policy "Purchases visibles par l'acheteur"
  on purchases for select using (auth.uid() = user_id);

alter table profiles enable row level security;
drop policy if exists "Profile visible par son propriétaire" on profiles;
create policy "Profile visible par son propriétaire"
  on profiles for all using (auth.uid() = id);

-- ─── Trigger : créer un profil à l'inscription ───────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
