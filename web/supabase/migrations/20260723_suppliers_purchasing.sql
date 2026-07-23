-- LOTrack suppliers, purchase receiving, and supplier payments.
-- Run after 20260723_sales_customers.sql.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null check (length(trim(name))>=2),
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_suppliers_workspace_name on public.suppliers(workspace_id,name);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  purchase_number text not null unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'received' check(status in ('draft','received','cancelled')),
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  payment_status text not null check(payment_status in ('paid','partial','unpaid')),
  reference text,
  notes text,
  ordered_at timestamptz not null default now(),
  received_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchases_workspace_created on public.purchase_orders(workspace_id,created_at desc);
create index if not exists idx_purchases_supplier on public.purchase_orders(supplier_id);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchase_orders(id) on delete restrict,
  workspace_id uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  sku text not null,
  quantity integer not null check(quantity>0),
  unit_cost numeric(12,2) not null check(unit_cost>=0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchase_items_purchase on public.purchase_items(purchase_id);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_id uuid not null references public.purchase_orders(id) on delete restrict,
  amount numeric(12,2) not null check(amount>0),
  payment_method text not null check(payment_method in ('cash','card','transfer','mobile')),
  reference text,
  notes text,
  paid_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_supplier_payments_purchase on public.supplier_payments(purchase_id);

alter table public.stock_movements add column if not exists purchase_id uuid references public.purchase_orders(id) on delete set null;
alter table public.stock_movements add column if not exists purchase_item_id uuid references public.purchase_items(id) on delete set null;

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_items enable row level security;
alter table public.supplier_payments enable row level security;
create policy "suppliers_workspace_select" on public.suppliers for select to authenticated using(workspace_id=public.current_workspace_id());
create policy "suppliers_manager_insert" on public.suppliers for insert to authenticated with check(workspace_id=public.current_workspace_id() and created_by=auth.uid() and public.has_permission('manage_purchases'));
create policy "suppliers_manager_update" on public.suppliers for update to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('manage_purchases')) with check(workspace_id=public.current_workspace_id());
create policy "suppliers_manager_delete" on public.suppliers for delete to authenticated using(workspace_id=public.current_workspace_id() and public.current_user_role() in ('owner','admin'));
create policy "purchases_workspace_select" on public.purchase_orders for select to authenticated using(workspace_id=public.current_workspace_id());
create policy "purchase_items_workspace_select" on public.purchase_items for select to authenticated using(workspace_id=public.current_workspace_id());
create policy "supplier_payments_workspace_select" on public.supplier_payments for select to authenticated using(workspace_id=public.current_workspace_id());
grant select,insert,update,delete on public.suppliers to authenticated;
grant select on public.purchase_orders,public.purchase_items,public.supplier_payments to authenticated;

create or replace function public.receive_purchase(
  p_supplier_id uuid,p_items jsonb,p_tax numeric default 0,p_amount_paid numeric default 0,
  p_reference text default null,p_notes text default null
) returns public.purchase_orders
language plpgsql security definer set search_path=public as $$
declare
  v_purchase public.purchase_orders%rowtype;v_product public.products%rowtype;v_item jsonb;
  v_quantity integer;v_unit_cost numeric(12,2);v_subtotal numeric(12,2):=0;v_total numeric(12,2);
  v_line_total numeric(12,2);v_purchase_item_id uuid;v_new_cost numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_permission('manage_purchases') then raise exception 'Purchase permission required'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Add at least one product'; end if;
  if p_tax<0 or p_amount_paid<0 then raise exception 'Amounts cannot be negative'; end if;
  if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and workspace_id=public.current_workspace_id()) then raise exception 'Supplier not found'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity:=(v_item->>'quantity')::integer;v_unit_cost:=(v_item->>'unit_cost')::numeric;
    if v_quantity is null or v_quantity<=0 or v_unit_cost is null or v_unit_cost<0 then raise exception 'Invalid purchase line'; end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and workspace_id=public.current_workspace_id() for update;
    if not found then raise exception 'Product not found'; end if;
    v_subtotal:=v_subtotal+(v_quantity*v_unit_cost);
  end loop;
  v_total:=v_subtotal+p_tax;if p_amount_paid>v_total then raise exception 'Amount paid cannot exceed total'; end if;
  insert into public.purchase_orders(workspace_id,purchase_number,supplier_id,status,subtotal,tax_amount,total_amount,amount_paid,payment_status,reference,notes,received_at,created_by)
  values(public.current_workspace_id(),'PO-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(gen_random_uuid()::text,1,8)),p_supplier_id,'received',v_subtotal,p_tax,v_total,p_amount_paid,
    case when p_amount_paid>=v_total then 'paid' when p_amount_paid>0 then 'partial' else 'unpaid' end,nullif(trim(p_reference),''),nullif(trim(p_notes),''),now(),auth.uid())
  returning * into v_purchase;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity:=(v_item->>'quantity')::integer;v_unit_cost:=(v_item->>'unit_cost')::numeric;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
    v_line_total:=v_quantity*v_unit_cost;
    insert into public.purchase_items(purchase_id,workspace_id,product_id,product_name,sku,quantity,unit_cost,line_total)
    values(v_purchase.id,v_purchase.workspace_id,v_product.id,v_product.name,v_product.sku,v_quantity,v_unit_cost,v_line_total) returning id into v_purchase_item_id;
    v_new_cost:=case when v_product.quantity+v_quantity=0 then v_unit_cost else round(((v_product.quantity*v_product.cost_price)+(v_quantity*v_unit_cost))/(v_product.quantity+v_quantity),2) end;
    update public.products set quantity=quantity+v_quantity,cost_price=v_new_cost,updated_at=now() where id=v_product.id;
    insert into public.stock_movements(product_id,type,quantity,note,user_id,workspace_id,unit_cost,unit_price,purchase_id,purchase_item_id)
    values(v_product.id,'stock_in',v_quantity,'Purchase '||v_purchase.purchase_number,auth.uid(),v_purchase.workspace_id,v_unit_cost,v_product.selling_price,v_purchase.id,v_purchase_item_id);
  end loop;
  if p_amount_paid>0 then insert into public.supplier_payments(workspace_id,supplier_id,purchase_id,amount,payment_method,reference,notes,paid_by)
    values(v_purchase.workspace_id,p_supplier_id,v_purchase.id,p_amount_paid,'transfer',p_reference,'Initial purchase payment',auth.uid());end if;
  return v_purchase;
end;
$$;
revoke all on function public.receive_purchase(uuid,jsonb,numeric,numeric,text,text) from public;
grant execute on function public.receive_purchase(uuid,jsonb,numeric,numeric,text,text) to authenticated;

create or replace function public.record_supplier_payment(
  p_purchase_id uuid,p_amount numeric,p_payment_method text,p_reference text default null,p_notes text default null
) returns public.supplier_payments
language plpgsql security definer set search_path=public as $$
declare v_purchase public.purchase_orders%rowtype;v_payment public.supplier_payments%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if not public.has_permission('manage_purchases') then raise exception 'Purchase permission required';end if;
  if p_amount is null or p_amount<=0 then raise exception 'Payment must be positive';end if;
  if p_payment_method not in ('cash','card','transfer','mobile') then raise exception 'Invalid payment method';end if;
  select * into v_purchase from public.purchase_orders where id=p_purchase_id and workspace_id=public.current_workspace_id() for update;
  if not found then raise exception 'Purchase not found';end if;
  if v_purchase.amount_paid+p_amount>v_purchase.total_amount then raise exception 'Payment exceeds outstanding balance';end if;
  insert into public.supplier_payments(workspace_id,supplier_id,purchase_id,amount,payment_method,reference,notes,paid_by)
  values(v_purchase.workspace_id,v_purchase.supplier_id,v_purchase.id,p_amount,p_payment_method,nullif(trim(p_reference),''),nullif(trim(p_notes),''),auth.uid()) returning * into v_payment;
  update public.purchase_orders set amount_paid=amount_paid+p_amount,payment_status=case when amount_paid+p_amount>=total_amount then 'paid' else 'partial' end where id=v_purchase.id;
  return v_payment;
end;
$$;
revoke all on function public.record_supplier_payment(uuid,numeric,text,text,text) from public;
grant execute on function public.record_supplier_payment(uuid,numeric,text,text,text) to authenticated;
