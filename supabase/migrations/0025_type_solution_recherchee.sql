-- Type de solution recherchée (loi Huwart : mix PV + végétalisation possible)
alter table leads
  add column if not exists type_solution_recherchee text not null default 'pv_pur';

alter table rfp_submissions
  add column if not exists type_solution_recherchee text not null default 'pv_pur';

alter table leads drop constraint if exists leads_type_solution_recherchee_check;
alter table leads add constraint leads_type_solution_recherchee_check
  check (type_solution_recherchee in ('pv_pur', 'mixte_pv_vegetal', 'vegetalisation_uniquement'));

alter table rfp_submissions drop constraint if exists rfp_submissions_type_solution_recherchee_check;
alter table rfp_submissions add constraint rfp_submissions_type_solution_recherchee_check
  check (type_solution_recherchee in ('pv_pur', 'mixte_pv_vegetal', 'vegetalisation_uniquement'));
