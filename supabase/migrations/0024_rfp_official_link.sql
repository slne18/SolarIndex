-- Référencement vers consultations officielles (PLACE, AWS, Megalis, etc.)

alter table rfp_submissions
  add column if not exists ao_publie_officiellement boolean not null default false,
  add column if not exists lien_consultation_officielle text,
  add column if not exists date_limite_offres date,
  add column if not exists nombre_places integer,
  add column if not exists type_proprietaire text
    check (type_proprietaire is null or type_proprietaire in (
      'prive', 'fonciere', 'centre_commercial', 'concession', 'autre'
    )),
  add column if not exists parking_deja_etudie boolean not null default false,
  add column if not exists documents_complementaires text;

comment on column rfp_submissions.lien_consultation_officielle is
  'URL publique vers PLACE, AWS, Megalis, Maximilien, etc. — référencement sans hébergement du DCE';

comment on column rfp_submissions.documents_complementaires is
  'URLs optionnelles (une par ligne) : présentation, photos, étude — hors DCE officiel';
