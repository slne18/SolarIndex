-- Plus d'échantillon gratuit : quota à 0 pour tous les profils + nouveaux comptes.

alter table profiles alter column sample_leads_remaining set default 0;

update profiles set sample_leads_remaining = 0;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, sample_leads_remaining)
  values (new.id, new.email, 0)
  on conflict (id) do nothing;
  return new;
end;
$$;
