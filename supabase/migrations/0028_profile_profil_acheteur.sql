-- Profil acheteur (installateurs) — n'affecte pas les droits, personnalise les emails.
alter table profiles
  add column if not exists profil_acheteur text
  check (profil_acheteur is null or profil_acheteur in ('installateur', 'tiers_investisseur'));

update profiles
set profil_acheteur = 'installateur'
where user_type = 'installateur'
  and profil_acheteur is null;
