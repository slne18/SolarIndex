-- Ancienneté / stabilité exploitant (API Recherche d'entreprises).
alter table leads add column if not exists siren_date_creation date;
alter table leads add column if not exists siren_etat_administratif text;
alter table leads add column if not exists siren_anciennete_checked_at timestamptz;

create index if not exists leads_siren_date_creation_idx on leads (siren_date_creation)
  where siren_date_creation is not null;
