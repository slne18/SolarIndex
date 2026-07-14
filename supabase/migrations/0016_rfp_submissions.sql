-- Produit B : marketplace appels d'offres (soumissions gérants de parking)

create table if not exists rfp_submissions (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  statut                text not null default 'en_attente_verification',
  -- en_attente_verification | en_attente_moderation | publie | rejete | ferme

  entreprise            text not null,
  siret                 text,
  siret_verifie         boolean default false,

  contact_nom           text not null,
  contact_fonction      text,
  contact_email         text not null,
  contact_telephone     text not null,
  email_verifie         boolean default false,
  verification_token    text unique,

  adresse               text not null,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  departement           text,
  region                text,

  surface_estimee_m2    numeric(10,1),
  deja_equipe_partiel   boolean default false,
  derogation_pente      boolean default false,
  derogation_abf        boolean default false,
  budget_indicatif      text,
  delai_souhaite        text,
  notes_particulieres   text,
  photos_urls           text[],

  consentement_rgpd     boolean not null,
  acheteurs_count       integer default 0,
  acheteurs_max         integer default 5
);

create index if not exists rfp_submissions_statut_idx on rfp_submissions (statut);
create index if not exists rfp_submissions_dept_idx on rfp_submissions (departement);

create table if not exists rfp_purchases (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  rfp_id              uuid references rfp_submissions(id) not null,
  user_id             uuid references auth.users(id) not null,
  stripe_session_id   text unique not null,
  stripe_payment_id   text,
  montant_eur         integer not null,
  statut              text default 'completed',
  unique (rfp_id, user_id)
);

create index if not exists rfp_purchases_user_idx on rfp_purchases (user_id);

alter table rfp_submissions enable row level security;
alter table rfp_purchases enable row level security;

-- Lecture publique des soumissions publiées (filtrage colonnes côté API).
create policy "rfp_published_select" on rfp_submissions
  for select using (statut = 'publie');

create policy "rfp_purchases_own" on rfp_purchases
  for select using (auth.uid() = user_id);
