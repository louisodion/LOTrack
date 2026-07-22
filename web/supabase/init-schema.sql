-- LOTrack production-ready MVP schema for Supabase.
-- Safe to run repeatedly in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  workspace_id uuid not null,
  full_name text,
  business_name text not null default '',
  business_type text not null default 'retail',
  currency text not null default 'NGN',
  default_low_stock_threshold integer not null default 5 check (default_low_stock_threshold > 0),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  sku text not null,
  quantity integer not null default 0 check (quantity >= 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  reorder_threshold integer not null default 1 check (reorder_threshold >= 0),
  user_id uuid not null references auth.users(id) on delete restrict,
  workspace_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, sku)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  type text not null check (type in ('stock_in', 'stock_out', 'sale', 'return', 'adjustment')),
  quantity integer not null check (quantity > 0),
  note text check (note is null or length(note) <= 240),
  user_id uuid not null references auth.users(id) on delete restrict,
  workspace_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

create index if not exists idx_profiles_workspace_id on public.profiles(workspace_id);
create index if not exists idx_products_workspace_id on public.products(workspace_id);
create index if not exists idx_products_user_id on public.products(user_id);
create index if not exists idx_movements_workspace_id on public.stock_movements(workspace_id);
create index if not exists idx_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_movements_created_at on public.stock_movements(created_at desc);

-- Existing early-development databases may have nullable columns. Backfill them
-- before applying the constraints used by the application.
update public.profiles set workspace_id = user_id where workspace_id is null;
update public.profiles set business_name = '' where business_name is null;
update public.profiles set business_type = 'retail' where business_type is null;
update public.profiles set currency = 'NGN' where currency is null;
update public.profiles set default_low_stock_threshold = 5 where default_low_stock_threshold is null or default_low_stock_threshold < 1;
update public.profiles set onboarded = false where onboarded is null;
update public.products set workspace_id = user_id where workspace_id is null;
update public.products set sku = 'LEGACY-' || left(id::text, 8) where sku is null or trim(sku) = '';
update public.products set quantity = 0 where quantity is null or quantity < 0;
update public.products set price = 0 where price is null or price < 0;
update public.products set reorder_threshold = 1 where reorder_threshold is null or reorder_threshold < 0;
delete from public.stock_movements where product_id is null or user_id is null;
update public.stock_movements set workspace_id = user_id where workspace_id is null;

alter table public.profiles alter column workspace_id set not null;
alter table public.profiles alter column business_name set not null;
alter table public.profiles alter column business_type set not null;
alter table public.profiles alter column currency set not null;
alter table public.profiles alter column default_low_stock_threshold set not null;
alter table public.profiles alter column onboarded set not null;
alter table public.products alter column workspace_id set not null;
alter table public.products alter column user_id set not null;
alter table public.products alter column sku set not null;
alter table public.products alter column quantity set not null;
alter table public.products alter column price set not null;
alter table public.products alter column reorder_threshold set not null;
alter table public.stock_movements alter column product_id set not null;
alter table public.stock_movements alter column user_id set not null;
alter table public.stock_movements alter column workspace_id set not null;

create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.workspace_id from public.profiles p where p.user_id = auth.uid() limit 1),
    auth.uid()
  );
$$;

revoke all on function public.current_workspace_id() from public;
grant execute on function public.current_workspace_id() to authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (user_id = auth.uid() and id = auth.uid() and workspace_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and id = auth.uid() and workspace_id = auth.uid());

drop policy if exists "products_workspace_select" on public.products;
drop policy if exists "products_workspace_insert" on public.products;
drop policy if exists "products_workspace_update" on public.products;
drop policy if exists "products_workspace_delete" on public.products;
create policy "products_workspace_select" on public.products for select to authenticated
  using (workspace_id = public.current_workspace_id());
create policy "products_workspace_insert" on public.products for insert to authenticated
  with check (user_id = auth.uid() and workspace_id = public.current_workspace_id());
create policy "products_workspace_update" on public.products for update to authenticated
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());
create policy "products_workspace_delete" on public.products for delete to authenticated
  using (workspace_id = public.current_workspace_id());

drop policy if exists "movements_workspace_select" on public.stock_movements;
create policy "movements_workspace_select" on public.stock_movements for select to authenticated
  using (workspace_id = public.current_workspace_id());

-- The only supported way to create a movement. It locks the product, validates
-- stock, updates quantity, and writes audit history in one transaction.
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_type text,
  p_quantity integer,
  p_note text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_delta integer;
  v_movement public.stock_movements%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_type not in ('stock_in', 'stock_out', 'sale', 'return', 'adjustment') then
    raise exception 'Invalid movement type';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if p_note is not null and length(p_note) > 240 then raise exception 'Note must be 240 characters or less'; end if;

  select * into v_product from public.products
  where id = p_product_id and workspace_id = public.current_workspace_id()
  for update;
  if not found then raise exception 'Product not found'; end if;

  v_delta := case when p_type in ('stock_in', 'return', 'adjustment') then p_quantity else -p_quantity end;
  if v_product.quantity + v_delta < 0 then raise exception 'Insufficient stock'; end if;

  update public.products
  set quantity = quantity + v_delta, updated_at = now()
  where id = v_product.id;

  insert into public.stock_movements(product_id, type, quantity, note, user_id, workspace_id)
  values (v_product.id, p_type, p_quantity, nullif(trim(p_note), ''), auth.uid(), v_product.workspace_id)
  returning * into v_movement;
  return v_movement;
end;
$$;

revoke all on function public.record_stock_movement(uuid, text, integer, text) from public;
grant execute on function public.record_stock_movement(uuid, text, integer, text) to authenticated;

-- Keep auth metadata useful for redirects while the profile remains authoritative.
create or replace function public.sync_profile_to_auth_metadata()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'workspace_id', new.workspace_id,
    'business_name', new.business_name,
    'business_type', new.business_type,
    'currency', new.currency,
    'default_low_stock_threshold', new.default_low_stock_threshold,
    'onboarded', new.onboarded
  )
  where id = new.user_id;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_sync_auth_metadata on public.profiles;
create trigger profiles_sync_auth_metadata before insert or update on public.profiles
for each row execute function public.sync_profile_to_auth_metadata();
