-- LOTrack team invitations, membership, and permission management.
-- Run after 20260723_catalog_analytics.sql.

alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.user_id and p.email is null;
create index if not exists idx_profiles_workspace_role on public.profiles(workspace_id, role);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  workspace_id uuid not null,
  email text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);
create index if not exists idx_invitations_workspace on public.workspace_invitations(workspace_id);
create index if not exists idx_invitations_token on public.workspace_invitations(token);

-- Members may see the other profiles in their current workspace.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_workspace" on public.profiles;
create policy "profiles_select_workspace" on public.profiles for select to authenticated
  using (user_id = auth.uid() or workspace_id = public.current_workspace_id());

alter table public.workspace_invitations enable row level security;
drop policy if exists "invitations_manager_select" on public.workspace_invitations;
drop policy if exists "invitations_manager_insert" on public.workspace_invitations;
drop policy if exists "invitations_manager_update" on public.workspace_invitations;
drop policy if exists "invitations_manager_delete" on public.workspace_invitations;
create policy "invitations_manager_select" on public.workspace_invitations for select to authenticated
  using (workspace_id = public.current_workspace_id() and public.current_user_role() in ('owner', 'admin'));
create policy "invitations_manager_insert" on public.workspace_invitations for insert to authenticated
  with check (
    workspace_id = public.current_workspace_id()
    and created_by = auth.uid()
    and public.current_user_role() in ('owner', 'admin')
    and (public.current_user_role() = 'owner' or role = 'staff')
  );
create policy "invitations_manager_update" on public.workspace_invitations for update to authenticated
  using (workspace_id = public.current_workspace_id() and public.current_user_role() in ('owner', 'admin'));
create policy "invitations_manager_delete" on public.workspace_invitations for delete to authenticated
  using (workspace_id = public.current_workspace_id() and public.current_user_role() in ('owner', 'admin'));
grant select, insert, update, delete on public.workspace_invitations to authenticated;

create or replace function public.accept_workspace_invitation(p_token uuid)
returns public.profiles
language plpgsql security definer set search_path = public, auth as $$
declare
  v_invite public.workspace_invitations%rowtype;
  v_source public.profiles%rowtype;
  v_profile public.profiles%rowtype;
  v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into v_invite from public.workspace_invitations
    where token = p_token and accepted_at is null and expires_at > now() for update;
  if not found then raise exception 'Invitation is invalid or expired'; end if;
  if lower(v_invite.email) <> v_email then raise exception 'Sign in with the email address that was invited'; end if;
  select * into v_source from public.profiles where workspace_id = v_invite.workspace_id and role = 'owner' limit 1;
  if not found then raise exception 'Workspace owner profile not found'; end if;

  insert into public.profiles(
    id,user_id,email,workspace_id,full_name,business_name,business_type,currency,
    default_low_stock_threshold,onboarded,role,permissions
  ) values (
    auth.uid(),auth.uid(),v_email,v_invite.workspace_id,
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(v_email,'@',1)),
    v_source.business_name,v_source.business_type,v_source.currency,
    v_source.default_low_stock_threshold,true,v_invite.role,v_invite.permissions
  )
  on conflict (id) do update set
    email=excluded.email,workspace_id=excluded.workspace_id,business_name=excluded.business_name,
    business_type=excluded.business_type,currency=excluded.currency,
    default_low_stock_threshold=excluded.default_low_stock_threshold,onboarded=true,
    role=excluded.role,permissions=excluded.permissions
  returning * into v_profile;

  update public.workspace_invitations set accepted_at=now(), accepted_by=auth.uid() where id=v_invite.id;
  return v_profile;
end;
$$;
revoke all on function public.accept_workspace_invitation(uuid) from public;
grant execute on function public.accept_workspace_invitation(uuid) to authenticated;

create or replace function public.update_workspace_member(
  p_user_id uuid, p_role text, p_permissions jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text := public.current_user_role();
  v_target public.profiles%rowtype;
begin
  if v_actor_role not in ('owner','admin') then raise exception 'Manager permission required'; end if;
  if p_role not in ('admin','staff') then raise exception 'Member role must be admin or staff'; end if;
  select * into v_target from public.profiles
    where user_id=p_user_id and workspace_id=public.current_workspace_id() for update;
  if not found then raise exception 'Team member not found'; end if;
  if v_target.role='owner' then raise exception 'The workspace owner cannot be changed'; end if;
  if v_actor_role='admin' and (v_target.role='admin' or p_role='admin') then raise exception 'Only the owner can manage administrators'; end if;
  update public.profiles set role=p_role, permissions=coalesce(p_permissions,'{}'::jsonb), updated_at=now()
    where user_id=p_user_id;
end;
$$;
revoke all on function public.update_workspace_member(uuid,text,jsonb) from public;
grant execute on function public.update_workspace_member(uuid,text,jsonb) to authenticated;

create or replace function public.remove_workspace_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text := public.current_user_role();
  v_target public.profiles%rowtype;
begin
  if v_actor_role not in ('owner','admin') then raise exception 'Manager permission required'; end if;
  if p_user_id=auth.uid() then raise exception 'You cannot remove yourself'; end if;
  select * into v_target from public.profiles
    where user_id=p_user_id and workspace_id=public.current_workspace_id() for update;
  if not found then raise exception 'Team member not found'; end if;
  if v_target.role='owner' then raise exception 'The workspace owner cannot be removed'; end if;
  if v_actor_role='admin' and v_target.role='admin' then raise exception 'Only the owner can remove administrators'; end if;
  update public.profiles set workspace_id=user_id,role='owner',permissions='{}'::jsonb,onboarded=false,updated_at=now()
    where user_id=p_user_id;
end;
$$;
revoke all on function public.remove_workspace_member(uuid) from public;
grant execute on function public.remove_workspace_member(uuid) to authenticated;
