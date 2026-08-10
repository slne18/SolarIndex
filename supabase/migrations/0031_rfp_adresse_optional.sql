-- Certains parkings n'ont pas d'adresse postale dédiée (zone d'activité, accès secondaire, etc.)
alter table rfp_submissions alter column adresse drop not null;
