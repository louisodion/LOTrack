-- LOTrack catalog, permissions, and analytics migration. Run after init-schema.sql.
alter table public.profiles add column if not exists role text not null default 'owner';
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner', 'admin', 'staff'));

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null check (length(trim(name)) >= 2),
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

alter table public.products add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists cost_price numeric(12,2) not null default 0;
alter table public.products add column if not exists selling_price numeric(12,2) not null default 0;
alter table public.products add column if not exists supplier text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists unit text not null default 'unit';
alter table public.products add column if not exists expiry_date date;
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists overstock_threshold integer;
update public.products set selling_price = coalesce(nullif(selling_price, 0), price, 0);
alter table public.products drop constraint if exists products_cost_price_check;
alter table public.products add constraint products_cost_price_check check (cost_price >= 0);
alter table public.products drop constraint if exists products_selling_price_check;
alter table public.products add constraint products_selling_price_check check (selling_price >= 0);

alter table public.stock_movements add column if not exists unit_cost numeric(12,2);
alter table public.stock_movements add column if not exists unit_price numeric(12,2);
create index if not exists idx_categories_workspace on public.categories(workspace_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_expiry on public.products(expiry_date);
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_movements_workspace_created on public.stock_movements(workspace_id, created_at desc);

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where user_id = auth.uid() limit 1), 'staff');
$$;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

create or replace function public.has_permission(permission_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role in ('owner', 'admin') or coalesce((permissions ->> permission_name)::boolean, false)
    from public.profiles where user_id = auth.uid() limit 1
  ), false);
$$;
revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

alter table public.categories enable row level security;
drop policy if exists "categories_workspace_select" on public.categories;
drop policy if exists "categories_manager_insert" on public.categories;
drop policy if exists "categories_manager_update" on public.categories;
drop policy if exists "categories_manager_delete" on public.categories;
create policy "categories_workspace_select" on public.categories for select to authenticated
  using (workspace_id = public.current_workspace_id());
create policy "categories_manager_insert" on public.categories for insert to authenticated
  with check (workspace_id = public.current_workspace_id() and created_by = auth.uid() and public.current_user_role() in ('owner', 'admin'));
create policy "categories_manager_update" on public.categories for update to authenticated
  using (workspace_id = public.current_workspace_id() and public.current_user_role() in ('owner', 'admin'))
  with check (workspace_id = public.current_workspace_id());
create policy "categories_manager_delete" on public.categories for delete to authenticated
  using (workspace_id = public.current_workspace_id() and public.current_user_role() in ('owner', 'admin'));
grant select, insert, update, delete on public.categories to authenticated;

-- Product reads remain workspace-wide. Mutations require a management permission.
drop policy if exists "products_workspace_insert" on public.products;
drop policy if exists "products_workspace_update" on public.products;
drop policy if exists "products_workspace_delete" on public.products;
create policy "products_workspace_insert" on public.products for insert to authenticated
  with check (user_id = auth.uid() and workspace_id = public.current_workspace_id() and public.has_permission('manage_products'));
create policy "products_workspace_update" on public.products for update to authenticated
  using (workspace_id = public.current_workspace_id() and public.has_permission('manage_products'))
  with check (workspace_id = public.current_workspace_id());
create policy "products_workspace_delete" on public.products for delete to authenticated
  using (workspace_id = public.current_workspace_id() and public.has_permission('manage_products'));

create or replace function public.record_stock_movement(
  p_product_id uuid, p_type text, p_quantity integer, p_note text default null
) returns public.stock_movements
language plpgsql security definer set search_path = public as $$
declare
  v_product public.products%rowtype;
  v_delta integer;
  v_movement public.stock_movements%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_type not in ('stock_in', 'stock_out', 'sale', 'return', 'adjustment') then raise exception 'Invalid movement type'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if p_note is not null and length(p_note) > 240 then raise exception 'Note must be 240 characters or less'; end if;
  select * into v_product from public.products
    where id = p_product_id and workspace_id = public.current_workspace_id() for update;
  if not found then raise exception 'Product not found'; end if;
  v_delta := case when p_type in ('stock_in', 'return', 'adjustment') then p_quantity else -p_quantity end;
  if v_product.quantity + v_delta < 0 then raise exception 'Insufficient stock'; end if;
  update public.products set quantity = quantity + v_delta, updated_at = now() where id = v_product.id;
  insert into public.stock_movements(product_id,type,quantity,note,user_id,workspace_id,unit_cost,unit_price)
  values (v_product.id,p_type,p_quantity,nullif(trim(p_note),''),auth.uid(),v_product.workspace_id,v_product.cost_price,v_product.selling_price)
  returning * into v_movement;
  return v_movement;
end;
$$;
revoke all on function public.record_stock_movement(uuid,text,integer,text) from public;
grant execute on function public.record_stock_movement(uuid,text,integer,text) to authenticated;
