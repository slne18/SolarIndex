-- Déclarations légales déposants (appels d'offres / consultation installateurs)

alter table rfp_submissions
  add column if not exists est_personne_publique boolean not null default false;

alter table rfp_submissions
  add column if not exists acceptation_conditions_deposant boolean not null default false;

comment on column rfp_submissions.est_personne_publique is
  'true si le déposant se déclare personne publique — soumissions refusées côté API';

comment on column rfp_submissions.acceptation_conditions_deposant is
  'true si toutes les déclarations CGV déposant ont été acceptées au moment du dépôt';
