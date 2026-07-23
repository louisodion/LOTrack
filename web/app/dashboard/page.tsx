"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { calculateAnalytics, dateRange, insightsFor, toCsv, type DatePreset } from "@/lib/analytics";
import { supabase } from "@/lib/supabaseClient";
import type { Category, Movement, Product, Purchase, UserRole } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [role, setRole] = useState<UserRole>("staff");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [currency, setCurrency] = useState("NGN");
  const [business, setBusiness] = useState("LOTrack");
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"revenue"|"profit"|"quantitySold"|"name">("revenue");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      supabase.from("profiles").select("business_name,currency,role,permissions").single(),
      supabase.from("products").select("id,name,sku,category_id,description,quantity,cost_price,selling_price,reorder_threshold,overstock_threshold,supplier,image_url,unit,expiry_date,barcode,categories(name)"),
      supabase.from("categories").select("id,name,description,workspace_id").order("name"),
      supabase.from("stock_movements").select("id,product_id,type,quantity,unit_cost,unit_price,created_at,sale_id,sale_item_id").order("created_at", { ascending: false }),
      supabase.from("purchase_orders").select("id,purchase_number,supplier_id,status,subtotal,tax_amount,total_amount,amount_paid,payment_status,reference,notes,received_at,created_at"),
      supabase.from("alerts").select("id",{count:"exact",head:true}).eq("is_active",true),
    ]).then(([profile, productResult, categoryResult, movementResult, purchaseResult, alertResult]) => {
      if (productResult.error || categoryResult.error || movementResult.error || purchaseResult.error) setError(productResult.error?.message ?? categoryResult.error?.message ?? movementResult.error?.message ?? purchaseResult.error?.message ?? "");
      setBusiness(profile.data?.business_name ?? "LOTrack"); setCurrency(profile.data?.currency ?? "NGN"); setRole((profile.data?.role ?? "staff") as UserRole); setPermissions((profile.data?.permissions ?? {}) as Record<string, boolean>);
      setProducts((productResult.data ?? []) as unknown as Product[]); setCategories((categoryResult.data ?? []) as Category[]); setMovements((movementResult.data ?? []) as Movement[]);
      setPurchases((purchaseResult.data ?? []) as Purchase[]);
      setActiveAlerts(alertResult.count ?? 0);
      setLoading(false);
    });
  }, []);

  const range = useMemo(() => dateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const analytics = useMemo(() => calculateAnalytics(products, categories, movements, range.start, range.end), [products, categories, movements, range]);
  const financial = role === "owner" || role === "admin" || Boolean(permissions.view_financials);
  const rangedPurchases = purchases.filter(p => {
    const date = new Date(p.received_at ?? p.created_at);
    return date >= range.start && date <= range.end && p.status === "received";
  });
  const purchaseTotal = rangedPurchases.reduce((sum,p)=>sum+Number(p.total_amount),0);
  const supplierBalance = purchases.reduce((sum,p)=>sum+Math.max(0,Number(p.total_amount)-Number(p.amount_paid)),0);
  const filtered = useMemo(() => analytics.rows.filter(r =>
    (!search || `${r.product.name} ${r.product.sku}`.toLowerCase().includes(search.toLowerCase())) &&
    (!category || r.product.category_id === category) && (!status || r.status === status)
  ).sort((a, b) => sort === "name" ? a.product.name.localeCompare(b.product.name) : b[sort] - a[sort]), [analytics.rows, search, category, status, sort]);
  const pageSize = 8, pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const exportCsv = () => {
    if (!(role === "owner" || role === "admin" || permissions.export_reports)) return;
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `lotrack-performance-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const kpis = [
    ["Total products", products.length], ["Total stock", analytics.totalStock], ["Low stock", analytics.lowStock],
    ["Out of stock", analytics.outOfStock], ["Overstocked", analytics.overstocked], ["Close to expiry", analytics.closeToExpiry],
    ["Categories", categories.length], ["Active alerts", activeAlerts],
    ...(financial ? [["Inventory value", money(analytics.inventoryValue)], ["Potential revenue", money(analytics.potentialRevenue)], ["Potential profit", money(analytics.potentialProfit)], ["Sales value", money(analytics.revenue)], ["Purchases", money(purchaseTotal)], ["Supplier balance", money(supplierBalance)], ["Total profit", money(analytics.profit)], ["Average margin", `${analytics.averageMargin.toFixed(1)}%`]] : []),
  ];
  const maxRevenue = Math.max(1, ...analytics.rows.map(r => r.revenue));
  const trend = useMemo(() => {
    const points = new Map<string, { revenue: number; profit: number; stock: number }>();
    for (const movement of movements.filter(m => new Date(m.created_at) >= range.start && new Date(m.created_at) <= range.end)) {
      const day = movement.created_at.slice(0, 10);
      const point = points.get(day) ?? { revenue: 0, profit: 0, stock: 0 };
      if (movement.type === "sale") {
        point.revenue += movement.quantity * Number(movement.unit_price ?? 0);
        point.profit += movement.quantity * (Number(movement.unit_price ?? 0) - Number(movement.unit_cost ?? 0));
      }
      if (movement.type === "return" && movement.sale_id) {
        point.revenue -= movement.quantity * Number(movement.unit_price ?? 0);
        point.profit -= movement.quantity * (Number(movement.unit_price ?? 0) - Number(movement.unit_cost ?? 0));
      }
      point.stock += movement.type === "stock_in" || movement.type === "return" || movement.type === "adjustment" ? movement.quantity : -movement.quantity;
      points.set(day, point);
    }
    return [...points.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  }, [movements, range]);

  return <AuthGuard><main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-[1500px] space-y-8"><AppNav/>
      <header className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm uppercase tracking-[.3em] text-emerald-300">Business intelligence</p><h1 className="mt-3 text-3xl font-semibold">{business} performance</h1><p className="mt-2 text-slate-400">Real results from recorded sales and current inventory.</p></div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/sign-in"); }} className="rounded-full bg-slate-800 px-5 py-3">Sign out</button></div>
        <div className="mt-6 flex flex-wrap gap-3">
          <select value={preset} onChange={e => { setPreset(e.target.value as DatePreset); setPage(1); }} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3">
            <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="lastMonth">Last month</option><option value="quarter">This quarter</option><option value="year">This year</option><option value="custom">Custom range</option>
          </select>
          {preset === "custom" && <><input aria-label="Start date" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/><input aria-label="End date" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/></>}
        </div>
      </header>
      {error && <div className="rounded-2xl bg-rose-500/10 p-4 text-rose-300">{error}</div>}
      {loading ? <div className="rounded-3xl bg-slate-900 p-10 text-slate-400">Calculating analytics…</div> : <>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{kpis.map(([label,value]) => <article key={String(label)} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5"><p className="text-xs uppercase tracking-[.18em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></article>)}</section>
        {movements.filter(m => m.type === "sale" && new Date(m.created_at) >= range.start && new Date(m.created_at) <= range.end).length === 0 ?
          <section className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center"><h2 className="text-xl font-semibold">No sales in this period</h2><p className="mt-2 text-slate-400">Record a sale from Stock Activity to unlock revenue, profit, trends, and performance rankings.</p></section> :
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">Revenue by product</h2><div className="mt-6 space-y-4">{[...analytics.rows].sort((a,b)=>b.revenue-a.revenue).slice(0,8).map(row => <div key={row.product.id}><div className="flex justify-between text-sm"><span>{row.product.name}</span><span>{money(row.revenue)}</span></div><div className="mt-2 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-emerald-400" style={{ width: `${row.revenue / maxRevenue * 100}%` }}/></div></div>)}</div></article>
            <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">Business insights</h2><div className="mt-6 space-y-3">{insightsFor(analytics).length ? insightsFor(analytics).map(text => <p key={text} className="rounded-2xl bg-slate-950/80 p-4 text-sm text-slate-300">{text}</p>) : <p className="text-slate-400">Record more activity to generate recommendations.</p>}</div></article>
            <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">Sales and profit trend</h2><p className="mt-1 text-sm text-slate-400">Daily values for up to 14 recent active days.</p><MiniBars data={trend.map(([label,value]) => ({ label: label.slice(5), primary: value.revenue, secondary: value.profit }))}/></article>
            <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">Category revenue and stock value</h2><p className="mt-1 text-sm text-slate-400">Compare demand with capital currently held in stock.</p><MiniBars data={analytics.categoryRows.map(row => ({ label: row.category.name, primary: row.revenue, secondary: row.stockValue })).slice(0, 10)}/></article>
            <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7 lg:col-span-2"><h2 className="text-xl font-semibold">Purchases versus sales</h2><p className="mt-1 text-sm text-slate-400">Compare supplier purchasing with net sales revenue in the selected period.</p><MiniBars data={[{label:"Selected period",primary:purchaseTotal,secondary:analytics.revenue}]}/></article>
          </section>}
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-2xl font-semibold">Product Performance</h2><p className="text-sm text-slate-400">Search, filter, sort, and export calculated results.</p></div>{(role === "owner" || role === "admin" || permissions.export_reports) && <button onClick={exportCsv} className="rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950">Export CSV</button>}</div>
          <div className="mt-6 grid gap-3 md:grid-cols-4"><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search product…" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/><select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="">All statuses</option>{["Top Performing","Performing Well","Average","Slow Moving","No Sales","Low Stock","Out of Stock","Overstocked"].map(s=><option key={s}>{s}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="revenue">Sort by revenue</option><option value="profit">Sort by profit</option><option value="quantitySold">Sort by units sold</option><option value="name">Sort by name</option></select></div>
          <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-400"><tr>{["Product","Category","Sold",...(financial?["Revenue","Profit","Margin"]:[]),"Stock","Reorder","Days left","Status","Action"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{visible.map(r=><tr key={r.product.id}><td className="px-4 py-4"><p className="font-semibold">{r.product.name}</p><p className="text-xs text-slate-500">{r.product.sku}</p></td><td className="px-4">{r.product.categories?.name??"Uncategorized"}</td><td className="px-4">{r.quantitySold}</td>{financial&&<><td className="px-4">{money(r.revenue)}</td><td className="px-4">{money(r.profit)}</td><td className="px-4">{r.margin.toFixed(1)}%</td></>}<td className="px-4">{r.product.quantity}</td><td className="px-4">{r.product.reorder_threshold}</td><td className="px-4">{r.daysRemaining?.toFixed(1)??"—"}</td><td className="px-4">{r.status}</td><td className="px-4 text-emerald-300">{r.action}</td></tr>)}</tbody></table></div>
          <div className="mt-5 flex items-center justify-between"><p className="text-sm text-slate-400">Page {page} of {pages}</p><div className="flex gap-2"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="rounded-full bg-slate-800 px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page===pages} onClick={()=>setPage(p=>p+1)} className="rounded-full bg-slate-800 px-4 py-2 disabled:opacity-40">Next</button></div></div>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-2xl font-semibold">Category performance</h2><div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-400"><tr>{["Category","Products","Sold",...(financial?["Revenue","Profit","Stock value"]:[]),"Best product","Status"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{analytics.categoryRows.map(r=><tr key={r.category.id}><td className="px-4 py-4 font-semibold">{r.category.name}</td><td className="px-4">{r.products}</td><td className="px-4">{r.quantitySold}</td>{financial&&<><td className="px-4">{money(r.revenue)}</td><td className="px-4">{money(r.profit)}</td><td className="px-4">{money(r.stockValue)}</td></>}<td className="px-4">{r.best}</td><td className="px-4">{r.status}</td></tr>)}</tbody></table></div></section>
      </>}
    </div>
  </main></AuthGuard>;
}

function MiniBars({ data }: { data: Array<{ label: string; primary: number; secondary: number }> }) {
  const max = Math.max(1, ...data.flatMap(item => [item.primary, item.secondary]));
  return <div className="mt-6 space-y-4">{data.length === 0 ? <p className="text-slate-400">No activity in this period.</p> : data.map(item => <div key={item.label}>
    <p className="truncate text-xs text-slate-400">{item.label}</p>
    <div className="mt-1 grid gap-1"><div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-cyan-400" style={{ width: `${item.primary / max * 100}%` }}/></div><div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-emerald-400" style={{ width: `${item.secondary / max * 100}%` }}/></div></div>
  </div>)}</div>;
}
