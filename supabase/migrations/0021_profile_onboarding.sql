-- Profil utilisateur : complétion post-inscription (installateur / propriétaire / gérant)

alter table profiles
  add column if not exists user_type text
    check (user_type is null or user_type in ('installateur', 'proprietaire', 'gerant_parking')),
  add column if not exists proprietaire_raison_sociale text,
  add column if not exists proprietaire_nom text,
  add column if not exists responsable_prenom text,
  add column if not exists responsable_nom text,
  add column if not exists telephone_bureau text,
  add column if not exists adresse_parking text,
  add column if not exists surface_m2_estimee integer,
  add column if not exists projet_delai text
    check (projet_delai is null or projet_delai in ('en_cours', 'six_mois', 'reflexion')),
  add column if not exists commentaire text,
  add column if not exists profile_completed_at timestamptz;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, entreprise)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data->>'entreprise'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
