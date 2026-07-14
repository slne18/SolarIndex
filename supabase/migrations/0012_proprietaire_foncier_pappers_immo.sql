-- Bypass 3 : propriétaire foncier via jointure MAJIC DGFiP (open data)

alter table leads add column if not exists proprietaire_foncier text;
alter table leads add column if not exists siren_proprietaire_foncier text;

alter table leads drop column if exists siren_proprietaire;
alter table leads drop column if exists raison_sociale_proprietaire;
alter table leads drop column if exists type_entite;
alter table leads drop column if exists type_proprietaire;
