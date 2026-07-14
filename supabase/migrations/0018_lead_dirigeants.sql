-- Dirigeants exploitant / propriétaire + téléphones associés

alter table leads add column if not exists dirigeant_exploitant text;
alter table leads add column if not exists dirigeant_exploitant_qualite text;
alter table leads add column if not exists dirigeant_proprietaire text;
alter table leads add column if not exists dirigeant_proprietaire_qualite text;
alter table leads add column if not exists telephone_exploitant text;
alter table leads add column if not exists telephone_proprietaire text;

update leads
set dirigeant_exploitant = dirigeant_nom
where dirigeant_exploitant is null
  and dirigeant_nom is not null
  and btrim(dirigeant_nom) <> '';

update leads
set telephone_exploitant = telephone
where telephone_exploitant is null
  and telephone is not null
  and btrim(telephone) <> '';
