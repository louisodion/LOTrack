-- LOTrack rule-based alerts, preferences, and per-user notification state.
-- Run after 20260723_suppliers_purchasing.sql.

create table if not exists public.alert_preferences (
  workspace_id uuid primary key,
  expiry_warning_days integer not null default 30 check(expiry_warning_days between 1 and 365),
  projected_stockout_days integer not null default 7 check(projected_stockout_days between 1 and 90),
  customer_balance_overdue_days integer not null default 7 check(customer_balance_overdue_days between 1 and 365),
  supplier_balance_overdue_days integer not null default 7 check(supplier_balance_overdue_days between 1 and 365),
  fast_selling_multiplier numeric(5,2) not null default 1.5 check(fast_selling_multiplier>=1),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  fingerprint text not null,
  type text not null check(type in ('out_of_stock','low_stock','expiry','projected_stockout','fast_selling','customer_balance','supplier_balance')),
  severity text not null check(severity in ('info','warning','critical')),
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(workspace_id,fingerprint)
);
create index if not exists idx_alerts_workspace_active on public.alerts(workspace_id,is_active,severity);

create table if not exists public.alert_user_states (
  alert_id uuid not null references public.alerts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  dismissed_at timestamptz,
  primary key(alert_id,user_id)
);

alter table public.alert_preferences enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_user_states enable row level security;
create policy "alert_preferences_workspace_select" on public.alert_preferences for select to authenticated using(workspace_id=public.current_workspace_id());
create policy "alert_preferences_manager_insert" on public.alert_preferences for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.current_user_role() in ('owner','admin'));
create policy "alert_preferences_manager_update" on public.alert_preferences for update to authenticated using(workspace_id=public.current_workspace_id() and public.current_user_role() in ('owner','admin')) with check(workspace_id=public.current_workspace_id());
create policy "alerts_workspace_select" on public.alerts for select to authenticated using(workspace_id=public.current_workspace_id());
create policy "alert_states_own_select" on public.alert_user_states for select to authenticated using(user_id=auth.uid());
create policy "alert_states_own_insert" on public.alert_user_states for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.alerts a where a.id=alert_id and a.workspace_id=public.current_workspace_id()));
create policy "alert_states_own_update" on public.alert_user_states for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update on public.alert_preferences to authenticated;
grant select on public.alerts to authenticated;
grant select,insert,update on public.alert_user_states to authenticated;

create or replace function public.refresh_workspace_alerts()
returns integer language plpgsql security definer set search_path=public as $$
declare
  v_workspace uuid:=public.current_workspace_id();v_prefs public.alert_preferences%rowtype;
  v_product public.products%rowtype;v_sale public.sales%rowtype;v_purchase public.purchase_orders%rowtype;
  v_daily numeric;v_days numeric;v_last7 integer;v_prev7 integer;v_count integer:=0;v_balance numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  insert into public.alert_preferences(workspace_id,updated_by) values(v_workspace,auth.uid()) on conflict(workspace_id) do nothing;
  select * into v_prefs from public.alert_preferences where workspace_id=v_workspace;
  update public.alerts set is_active=false,resolved_at=now() where workspace_id=v_workspace and is_active=true;
  for v_product in select * from public.products where workspace_id=v_workspace loop
    if v_product.quantity=0 then
      insert into public.alerts(workspace_id,fingerprint,type,severity,title,message,entity_type,entity_id,action_url,metadata,is_active,last_detected_at,resolved_at)
      values(v_workspace,'out:'||v_product.id,'out_of_stock','critical',v_product.name||' is out of stock','Restock this product before the next sale.','product',v_product.id,'/products/'||v_product.id,jsonb_build_object('quantity',0),true,now(),null)
      on conflict(workspace_id,fingerprint) do update set severity=excluded.severity,title=excluded.title,message=excluded.message,metadata=excluded.metadata,is_active=true,last_detected_at=now(),resolved_at=null;v_count:=v_count+1;
    elsif v_product.quantity<=v_product.reorder_threshold then
      insert into public.alerts(workspace_id,fingerprint,type,severity,title,message,entity_type,entity_id,action_url,metadata,is_active,last_detected_at,resolved_at)
      values(v_workspace,'low:'||v_product.id,'low_stock','warning',v_product.name||' is low on stock','Current stock is '||v_product.quantity||'; reorder threshold is '||v_product.reorder_threshold||'.','product',v_product.id,'/products/'||v_product.id,jsonb_build_object('quantity',v_product.quantity,'threshold',v_product.reorder_threshold),true,now(),null)
      on conflict(workspace_id,fingerprint) do update set title=excluded.title,message=excluded.message,metadata=excluded.metadata,is_active=true,last_detected_at=now(),resolved_at=null;v_count:=v_count+1;
    end if;
    if v_product.expiry_date is not null and v_product.expiry_date between current_date and current_date+v_prefs.expiry_warning_days then
      insert into public.alerts(workspace_id,fingerprint,type,severity,title,message,entity_type,entity_id,action_url,metadata,is_active,last_detected_at,resolved_at)
      values(v_workspace,'expiry:'||v_product.id,'expiry','warning',v_product.name||' is close to expiry','Expiry date: '||v_product.expiry_date||'.','product',v_product.id,'/products/'||v_product.id,jsonb_build_object('expiry_date',v_product.expiry_date),true,now(),null)
      on conflict(workspace_id,fingerprint) do update set title=excluded.title,message=excluded.message,metadata=excluded.metadata,is_active=true,last_detected_at=now(),resolved_at=null;v_count:=v_count+1;
    end if;
    select coalesce(sum(quantity),0)/30.0 into v_daily from public.stock_movements where workspace_id=v_workspace and product_id=v_product.id and type='sale' and created_at>=now()-interval '30 days';
    if v_daily>0 and v_product.quantity>0 then v_days:=v_product.quantity/v_daily;
      if v_days<=v_prefs.projected_stockout_days then
        insert into public.alerts(workspace_id,fingerprint,type,severity,title,message,entity_type,entity_id,action_url,metadata,is_active,last_detected_at,resolved_at)
        values(v_workspace,'projected:'||v_product.id,'projected_stockout','warning',v_product.name||' may run out soon','Estimated stock remaining: '||round(v_days,1)||' days.','product',v_product.id,'/purchases/new',jsonb_build_object('days_remaining',round(v_days,1)),true,now(),null)
        on conflict(workspace_id,fingerprint) do update set title=excluded.title,message=excluded.message,metadata=excluded.metadata,is_active=true,last_detected_at=now(),resolved_at=null;v_count:=v_count+1;
      end if;
    end if;
    select coalesce(sum(quantity),0) into v_last7 from public.stock_movements where workspace_id=v_workspace and product_id=v_product.id and type='sale' and created_at>=now()-interval '7 days';
    select coalesce(sum(quantity),0) into v_prev7 from public.stock_movements where workspace_id=v_workspace and product_id=v_product.id and type='sale' and created_at>=now()-interval '14 days' and created_at<now()-interval '7 days';
    if v_last7>=3 and v_last7>greatest(v_prev7,1)*v_prefs.fast_selling_multiplier then
      insert into public.alerts(workspace_id,fingerprint,type,severity,title,message,entity_type,entity_id,action_url,metadata,is_active,last_detected_at,resolved_at)
      values(v_workspace,'fast:'||v_product.id,'fast_selling','info',v_product.name||' is selling faster','Last 7 days: '||v_last7||' units; previous 7 days: '||v_prev7||'.','product',v_product.id,'/dashboard',jsonb_build_object('last_7_days',v_last7,'previous_7_days',v_prev7),true,now(),null)
      on conflict(workspace_id,fingerprint) do update set title=excluded.title,message=excluded.message,metadata=excluded.metadata,is_active=true,last_detected_at=now(),resolved_at=null;v_count:=v_count+1;
    end if;
  end loop;
  for v_sale in select * from public.sales where workspace_id=v_workspace and payment_status<>'paid' and created_at<now()-(v_prefs.customer_balance_overdue_days||' days')::interval loop
    v_balance:=v_sale.total_amount-v_sale.amount_paid;if v_balance>0 then
      insert into public.alerts(workspace_id,fingerprint,type,severity,title,message,entity_type,entity_id,action_url,metadata,is_active,last_detected_at,resolved_at)
      values(v_workspace,'customer-balance:'||v_sale.id,'customer_balance','warning','Customer balance is overdue','Receipt '||v_sale.receipt_number||' has an outstanding balance of '||v_balance||'.','sale',v_sale.id,'/sales/'||v_sale.id,jsonb_build_object('balance',v_balance),true,now(),null)
      on conflict(workspace_id,fingerprint) do update set message=excluded.message,metadata=excluded.metadata,is_active=true,last_detected_at=now(),resolved_at=null;v_count:=v_count+1;end if;
  end loop;
  for v_purchase in select * from public.purchase_orders where workspace_id=v_workspace and payment_status<>'paid' and created_at<now()-(v_prefs.supplier_balance_overdue_days||' days')::interval loop
    v_balance:=v_purchase.total_amount-v_purchase.amount_paid;if v_balance>0 then
      insert into public.alerts(workspace_id,fingerprint,type,severity,title,message,entity_type,entity_id,action_url,metadata,is_active,last_detected_at,resolved_at)
      values(v_workspace,'supplier-balance:'||v_purchase.id,'supplier_balance','warning','Supplier payment is outstanding','Purchase '||v_purchase.purchase_number||' has an outstanding balance of '||v_balance||'.','purchase',v_purchase.id,'/purchases',jsonb_build_object('balance',v_balance),true,now(),null)
      on conflict(workspace_id,fingerprint) do update set message=excluded.message,metadata=excluded.metadata,is_active=true,last_detected_at=now(),resolved_at=null;v_count:=v_count+1;end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.refresh_workspace_alerts() from public;
grant execute on function public.refresh_workspace_alerts() to authenticated;
