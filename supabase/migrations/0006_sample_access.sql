-- Échantillon gratuit : 2 leads / 1 département verrouillé à l'inscription.

alter table profiles
  add column if not exists sample_leads_remaining integer default 2,
  add column if not exists sample_departement text;

-- Profils existants : quota échantillon si pas encore consommé.
update profiles
set sample_leads_remaining = 2
where sample_leads_remaining is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, sample_leads_remaining)
  values (new.id, new.email, 2)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Rédemption atomique d'un crédit échantillon.
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fulfill_sample_lead'
      and pg_get_function_identity_arguments(p.oid) =
          'p_lead_id uuid, p_user_id uuid, p_stripe_ref text'
  ) then
    create function fulfill_sample_lead(
      p_lead_id uuid,
      p_user_id uuid,
      p_stripe_ref text
    )
    returns boolean
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    declare
      v_remaining int;
      v_dept text;
      v_lead_dept text;
      v_updated int;
    begin
      select sample_leads_remaining, sample_departement
        into v_remaining, v_dept
      from profiles
      where id = p_user_id
      for update;

      if not found or v_remaining is null or v_remaining <= 0 or v_dept is null then
        return false;
      end if;

      select departement into v_lead_dept from leads where id = p_lead_id;
      if v_lead_dept is null or v_lead_dept <> v_dept then
        return false;
      end if;

      update leads
      set statut = 'vendu',
          acheteur_id = p_user_id,
          vendu_at = now(),
          prix_vente_eur = 0
      where id = p_lead_id
        and statut = 'disponible';

      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        return false;
      end if;

      update profiles
      set sample_leads_remaining = sample_leads_remaining - 1
      where id = p_user_id;

      insert into purchases (
        lead_id, user_id, stripe_session_id, montant_eur, statut, lead_delivered_at, purchase_type
      ) values (
        p_lead_id, p_user_id, p_stripe_ref, 0, 'paid', now(), 'sample'
      )
      on conflict (stripe_session_id) do nothing;

      return true;
    end;
    $fn$;
  end if;
end $$;
