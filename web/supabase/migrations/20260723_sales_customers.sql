-- LOTrack customers, sales checkout, payments, receipts, and returns.
-- Run after 20260723_team_roles.sql.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null check (length(trim(name)) >= 2),
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_workspace_name on public.customers(workspace_id,name);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  receipt_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('cash','card','transfer','mobile','credit')),
  payment_status text not null check (payment_status in ('paid','partial','unpaid')),
  notes text,
  sold_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_sales_workspace_created on public.sales(workspace_id,created_at desc);
create index if not exists idx_sales_customer on public.sales(customer_id);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  workspace_id uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  returned_quantity integer not null default 0 check (returned_quantity >= 0 and returned_quantity <= quantity),
  unit_cost numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);
create index if not exists idx_sale_items_product on public.sale_items(product_id);

create table if not exists public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  sale_item_id uuid not null references public.sale_items(id) on delete restrict,
  workspace_id uuid not null,
  quantity integer not null check (quantity > 0),
  refund_amount numeric(12,2) not null default 0,
  reason text,
  processed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_sale_returns_sale on public.sale_returns(sale_id);

alter table public.stock_movements add column if not exists sale_id uuid references public.sales(id) on delete set null;
alter table public.stock_movements add column if not exists sale_item_id uuid references public.sale_items(id) on delete set null;

alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_returns enable row level security;

create policy "customers_workspace_select" on public.customers for select to authenticated using (workspace_id=public.current_workspace_id());
create policy "customers_workspace_insert" on public.customers for insert to authenticated with check (workspace_id=public.current_workspace_id() and created_by=auth.uid());
create policy "customers_workspace_update" on public.customers for update to authenticated using (workspace_id=public.current_workspace_id()) with check (workspace_id=public.current_workspace_id());
create policy "customers_workspace_delete" on public.customers for delete to authenticated using (workspace_id=public.current_workspace_id() and public.current_user_role() in ('owner','admin'));
create policy "sales_workspace_select" on public.sales for select to authenticated using (workspace_id=public.current_workspace_id());
create policy "sale_items_workspace_select" on public.sale_items for select to authenticated using (workspace_id=public.current_workspace_id());
create policy "returns_workspace_select" on public.sale_returns for select to authenticated using (workspace_id=public.current_workspace_id());
grant select,insert,update,delete on public.customers to authenticated;
grant select on public.sales,public.sale_items,public.sale_returns to authenticated;

create or replace function public.create_sale(
  p_customer_id uuid, p_items jsonb, p_discount numeric default 0, p_tax numeric default 0,
  p_payment_method text default 'cash', p_amount_paid numeric default 0, p_notes text default null
) returns public.sales
language plpgsql security definer set search_path=public as $$
declare
  v_sale public.sales%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_quantity integer;
  v_subtotal numeric(12,2):=0;
  v_total numeric(12,2);
  v_ratio numeric:=1;
  v_line_subtotal numeric(12,2);
  v_line_total numeric(12,2);
  v_sale_item_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.current_user_role() in ('owner','admin') or public.has_permission('record_sales')) then raise exception 'Sales permission required'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Add at least one product'; end if;
  if p_payment_method not in ('cash','card','transfer','mobile','credit') then raise exception 'Invalid payment method'; end if;
  if p_discount<0 or p_tax<0 or p_amount_paid<0 then raise exception 'Amounts cannot be negative'; end if;
  if p_customer_id is not null and not exists(select 1 from public.customers where id=p_customer_id and workspace_id=public.current_workspace_id()) then raise exception 'Customer not found'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity:=(v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity<=0 then raise exception 'Sale quantities must be positive'; end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and workspace_id=public.current_workspace_id() for update;
    if not found then raise exception 'Product not found'; end if;
    if v_product.quantity<v_quantity then raise exception 'Insufficient stock for %',v_product.name; end if;
    v_subtotal:=v_subtotal+(v_product.selling_price*v_quantity);
  end loop;
  if p_discount>v_subtotal then raise exception 'Discount cannot exceed subtotal'; end if;
  v_total:=v_subtotal-p_discount+p_tax;
  if p_amount_paid>v_total then raise exception 'Amount paid cannot exceed total'; end if;
  if v_subtotal>0 then v_ratio:=(v_subtotal-p_discount)/v_subtotal; end if;
  insert into public.sales(workspace_id,receipt_number,customer_id,subtotal,discount_amount,tax_amount,total_amount,amount_paid,payment_method,payment_status,notes,sold_by)
  values(public.current_workspace_id(),'LS-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(gen_random_uuid()::text,1,8)),p_customer_id,v_subtotal,p_discount,p_tax,v_total,p_amount_paid,p_payment_method,
    case when p_amount_paid>=v_total then 'paid' when p_amount_paid>0 then 'partial' else 'unpaid' end,nullif(trim(p_notes),''),auth.uid())
  returning * into v_sale;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity:=(v_item->>'quantity')::integer;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
    v_line_subtotal:=v_product.selling_price*v_quantity;
    v_line_total:=round(v_line_subtotal*v_ratio,2);
    insert into public.sale_items(sale_id,workspace_id,product_id,product_name,sku,quantity,unit_cost,unit_price,discount_amount,line_total)
    values(v_sale.id,v_sale.workspace_id,v_product.id,v_product.name,v_product.sku,v_quantity,v_product.cost_price,v_product.selling_price,v_line_subtotal-v_line_total,v_line_total)
    returning id into v_sale_item_id;
    update public.products set quantity=quantity-v_quantity,updated_at=now() where id=v_product.id;
    insert into public.stock_movements(product_id,type,quantity,note,user_id,workspace_id,unit_cost,unit_price,sale_id,sale_item_id)
    values(v_product.id,'sale',v_quantity,'Receipt '||v_sale.receipt_number,auth.uid(),v_sale.workspace_id,v_product.cost_price,round(v_product.selling_price*v_ratio,2),v_sale.id,v_sale_item_id);
  end loop;
  return v_sale;
end;
$$;
revoke all on function public.create_sale(uuid,jsonb,numeric,numeric,text,numeric,text) from public;
grant execute on function public.create_sale(uuid,jsonb,numeric,numeric,text,numeric,text) to authenticated;

create or replace function public.return_sale_item(p_sale_item_id uuid,p_quantity integer,p_reason text default null)
returns public.sale_returns language plpgsql security definer set search_path=public as $$
declare v_item public.sale_items%rowtype; v_return public.sale_returns%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.current_user_role() in ('owner','admin') or public.has_permission('record_sales')) then raise exception 'Sales permission required'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Return quantity must be positive'; end if;
  select * into v_item from public.sale_items where id=p_sale_item_id and workspace_id=public.current_workspace_id() for update;
  if not found then raise exception 'Sale item not found'; end if;
  if v_item.returned_quantity+p_quantity>v_item.quantity then raise exception 'Return exceeds sold quantity'; end if;
  update public.sale_items set returned_quantity=returned_quantity+p_quantity where id=v_item.id;
  update public.products set quantity=quantity+p_quantity,updated_at=now() where id=v_item.product_id;
  insert into public.sale_returns(sale_id,sale_item_id,workspace_id,quantity,refund_amount,reason,processed_by)
  values(v_item.sale_id,v_item.id,v_item.workspace_id,p_quantity,round((v_item.line_total/v_item.quantity)*p_quantity,2),nullif(trim(p_reason),''),auth.uid())
  returning * into v_return;
  insert into public.stock_movements(product_id,type,quantity,note,user_id,workspace_id,unit_cost,unit_price,sale_id,sale_item_id)
  values(v_item.product_id,'return',p_quantity,coalesce(nullif(trim(p_reason),''),'Sale return'),auth.uid(),v_item.workspace_id,v_item.unit_cost,v_item.line_total/v_item.quantity,v_item.sale_id,v_item.id);
  return v_return;
end;
$$;
revoke all on function public.return_sale_item(uuid,integer,text) from public;
grant execute on function public.return_sale_item(uuid,integer,text) to authenticated;
