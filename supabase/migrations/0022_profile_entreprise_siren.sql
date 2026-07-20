-- SIREN / immatriculation étrangère sur le profil utilisateur

alter table profiles
  add column if not exists siren text,
  add column if not exists siret text,
  add column if not exists pays_entreprise text,
  add column if not exists immatriculation_etrangere text;
