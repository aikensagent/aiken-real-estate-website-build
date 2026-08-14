-- Buyer account: link Supabase Auth to a lead and keep one notebook key.
-- Public writes stay off this table. Claim is SECURITY DEFINER + auth.uid() only.

alter table public.leads
  add column if not exists auth_user_id uuid unique,
  add column if not exists visitor_session_key text;

create unique index if not exists leads_auth_user_id_unique
  on public.leads (auth_user_id)
  where auth_user_id is not null;

create index if not exists leads_visitor_session_key_idx
  on public.leads (visitor_session_key)
  where visitor_session_key is not null;

comment on column public.leads.auth_user_id is
  'Supabase auth.users id for a claimed buyer account.';
comment on column public.leads.visitor_session_key is
  'Rou/Gholi notebook key claimed at first sign-in. Follows the account across devices.';

create or replace function public.claim_buyer_account(p_session_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '');
  v_lead_id uuid;
  v_auth uuid;
  v_session text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_session_key is null or length(trim(p_session_key)) = 0 then
    raise exception 'session_key is required';
  end if;
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'authenticated email is required';
  end if;

  select id, visitor_session_key
    into v_lead_id, v_session
  from public.leads
  where auth_user_id = v_uid
    and erased_at is null
  limit 1;

  if v_lead_id is not null then
    if v_session is null or length(trim(v_session)) = 0 then
      update public.leads
      set visitor_session_key = trim(p_session_key),
          last_activity_at = now()
      where id = v_lead_id;
      v_session := trim(p_session_key);
    else
      update public.leads
      set last_activity_at = now()
      where id = v_lead_id;
    end if;

    return jsonb_build_object(
      'lead_id', v_lead_id,
      'session_key', v_session,
      'email', v_email
    );
  end if;

  select id, auth_user_id, visitor_session_key
    into v_lead_id, v_auth, v_session
  from public.leads
  where email = v_email
    and erased_at is null
  limit 1;

  if v_lead_id is not null then
    if v_auth is not null and v_auth <> v_uid then
      raise exception 'email already linked';
    end if;

    update public.leads
    set auth_user_id = v_uid,
        visitor_session_key = coalesce(nullif(trim(v_session), ''), trim(p_session_key)),
        consent_email = true,
        last_activity_at = now()
    where id = v_lead_id
    returning visitor_session_key into v_session;

    return jsonb_build_object(
      'lead_id', v_lead_id,
      'session_key', v_session,
      'email', v_email
    );
  end if;

  insert into public.leads (
    email,
    auth_user_id,
    visitor_session_key,
    source,
    consent_given,
    consent_email,
    consent_timestamp,
    last_activity_at
  ) values (
    v_email,
    v_uid,
    trim(p_session_key),
    'account_auth',
    true,
    true,
    now(),
    now()
  )
  returning id, visitor_session_key into v_lead_id, v_session;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'session_key', v_session,
    'email', v_email
  );
end;
$$;

revoke all on function public.claim_buyer_account(text) from public, anon;
grant execute on function public.claim_buyer_account(text) to authenticated, service_role;

comment on function public.claim_buyer_account(text) is
  'Attach auth.uid() to a lead and keep the first visitor notebook key.';
