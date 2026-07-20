-- Compte : suppression utilisateur + propriétaire des dépôts RFP

alter table rfp_submissions
  add column if not exists deposant_user_id uuid references auth.users(id) on delete set null;

create index if not exists rfp_submissions_deposant_user_idx
  on rfp_submissions (deposant_user_id);

comment on column rfp_submissions.deposant_user_id is
  'Compte SolarIndex ayant déposé le projet (retrait et suppression de compte).';

-- Conserver les preuves d'achat sans bloquer la suppression du compte
alter table purchases drop constraint if exists purchases_user_id_fkey;
alter table purchases alter column user_id drop not null;
alter table purchases
  add constraint purchases_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table rfp_purchases drop constraint if exists rfp_purchases_user_id_fkey;
alter table rfp_purchases alter column user_id drop not null;
alter table rfp_purchases
  add constraint rfp_purchases_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table subscription_periods drop constraint if exists subscription_periods_user_id_fkey;
alter table subscription_periods
  add constraint subscription_periods_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
