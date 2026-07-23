"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { downloadCsv, productReport, reportRange, totalsForPurchases, type ReportSaleItem } from "@/lib/reports";
import { supabase } from "@/lib/supabaseClient";
import type { Product, Purchase, Sale, UserRole } from "@/lib/types";

type Party = { id: string; name: string };

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<ReportSaleItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [currency, setCurrency] = useState("NGN");
  const [role, setRole] = useState<UserRole>("staff");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [preset, setPreset] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      supabase.from("profiles").select("currency,role,permissions").single(),
      supabase.from("products").select("id,name,sku,category_id,description,quantity,cost_price,selling_price,reorder_threshold,overstock_threshold,supplier,image_url,unit,expiry_date,barcode"),
      supabase.from("sales").select("id,receipt_number,customer_id,subtotal,discount_amount,tax_amount,total_amount,amount_paid,payment_method,payment_status,notes,sold_by,created_at"),
      supabase.from("sale_items").select("id,sale_id,product_id,product_name,sku,quantity,returned_quantity,unit_cost,unit_price,discount_amount,line_total,sale_returns(quantity,refund_amount)"),
      supabase.from("purchase_orders").select("id,purchase_number,supplier_id,status,subtotal,tax_amount,total_amount,amount_paid,payment_status,reference,notes,received_at,created_at"),
      supabase.from("customers").select("id,name"),
      supabase.from("suppliers").select("id,name"),
    ]).then(([profile, productResult, saleResult, itemResult, purchaseResult, customerResult, supplierResult]) => {
      const queryError = productResult.error ?? saleResult.error ?? itemResult.error ?? purchaseResult.error ?? customerResult.error ?? supplierResult.error;
      setError(queryError?.message ?? "");
      setCurrency(profile.data?.currency ?? "NGN");
      setRole((profile.data?.role ?? "staff") as UserRole);
      setPermissions((profile.data?.permissions ?? {}) as Record<string, boolean>);
      setProducts((productResult.data ?? []) as Product[]);
      setSales((saleResult.data ?? []) as Sale[]);
      setSaleItems((itemResult.data ?? []) as unknown as ReportSaleItem[]);
      setPurchases((purchaseResult.data ?? []) as Purchase[]);
      setCustomers((customerResult.data ?? []) as Party[]);
      setSuppliers((supplierResult.data ?? []) as Party[]);
      setLoading(false);
    });
  }, []);

  const financial = role === "owner" || role === "admin" || Boolean(permissions.view_financials);
  const canExport = role === "owner" || role === "admin" || Boolean(permissions.export_reports);
  const range = useMemo(() => reportRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const rangedSales = useMemo(() => sales.filter(sale => {
    const date = new Date(sale.created_at);
    return date >= range.start && date <= range.end;
  }), [sales, range]);
  const rows = useMemo(() => productReport(products, sales, saleItems, range.start, range.end)
    .filter(row => !search || `${row.name} ${row.sku}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.netRevenue - a.netRevenue), [products, sales, saleItems, range, search]);
  const purchaseTotals = useMemo(() => totalsForPurchases(purchases, range.start, range.end), [purchases, range]);
  const revenue = rows.reduce((sum, row) => sum + row.netRevenue, 0);
  const profit = rows.reduce((sum, row) => sum + row.profit, 0);
  const units = rows.reduce((sum, row) => sum + row.sold - row.returned, 0);
  const outstanding = rangedSales.reduce((sum, sale) => sum + Math.max(0, Number(sale.total_amount) - Number(sale.amount_paid)), 0);
  const inventoryValue = rows.reduce((sum, row) => sum + row.stockValue, 0);
  const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const customerRows = useMemo(() => customers.map(customer => {
    const records = rangedSales.filter(sale => sale.customer_id === customer.id);
    const total = records.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const paid = records.reduce((sum, sale) => sum + Number(sale.amount_paid), 0);
    return { id: customer.id, name: customer.name, count: records.length, total, balance: total - paid };
  }).filter(row => row.count > 0).sort((a, b) => b.total - a.total), [customers, rangedSales]);
  const supplierRows = useMemo(() => suppliers.map(supplier => {
    const records = purchases.filter(purchase => purchase.supplier_id === supplier.id && purchase.status === "received" && new Date(purchase.received_at ?? purchase.created_at) >= range.start && new Date(purchase.received_at ?? purchase.created_at) <= range.end);
    const total = records.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);
    const paid = records.reduce((sum, purchase) => sum + Number(purchase.amount_paid), 0);
    return { id: supplier.id, name: supplier.name, count: records.length, total, balance: total - paid };
  }).filter(row => row.count > 0).sort((a, b) => b.total - a.total), [suppliers, purchases, range]);
  const maxRevenue = Math.max(1, ...rows.map(row => row.netRevenue));

  const exportProducts = () => {
    if (!canExport) return;
    const headers = ["Product", "SKU", "Units sold", "Returns", "Net revenue", ...(financial ? ["Cost", "Profit", "Stock value"] : []), "Stock"];
    downloadCsv(`lotrack-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows.map(row => [
      row.name, row.sku, row.sold, row.returned, row.netRevenue, ...(financial ? [row.cost, row.profit, row.stockValue] : []), row.stock,
    ]));
  };

  const kpis: [string, string | number, string][] = [
    ["Net sales", money(revenue), `${rangedSales.length} transactions`],
    ["Units sold", units, `${rows.filter(row => row.sold > 0).length} active products`],
    ["Customer balances", money(outstanding), "Outstanding in selected period"],
    ["Purchases", money(purchaseTotals.total), `${purchaseTotals.count} received orders`],
    ...(financial ? [
      ["Gross profit", money(profit), revenue ? `${((profit / revenue) * 100).toFixed(1)}% margin` : "No sales yet"],
      ["Inventory value", money(inventoryValue), "Current cost value"],
    ] as [string, string, string][] : []),
  ];

  return <AuthGuard><main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1500px] space-y-8"><AppNav/>
    <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/60 p-8 print:border-0 print:bg-white print:p-0">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm uppercase tracking-[.3em] text-emerald-300">Reports and exports</p><h1 className="mt-3 text-3xl font-semibold">Business performance report</h1><p className="mt-2 text-slate-400">Sales, stock, customers, and suppliers in one decision-ready view.</p></div>
        <div className="flex flex-wrap gap-3 print:hidden"><button disabled={!canExport} onClick={exportProducts} className="rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Export CSV</button><button onClick={() => window.print()} className="rounded-full border border-slate-600 px-5 py-3 font-semibold">Print / PDF</button></div></div>
      <div className="mt-7 flex flex-wrap gap-3 print:hidden"><select value={preset} onChange={event => setPreset(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom range</option></select>{preset === "custom" && <><input aria-label="Start date" type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/><input aria-label="End date" type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/></>}<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Filter products…" className="min-w-56 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/></div>
    </header>
    {!canExport && <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">You can view operational reports. Ask an administrator for export access.</p>}
    {error && <p className="rounded-2xl bg-rose-500/10 p-4 text-rose-300">{error}</p>}
    {loading ? <section className="rounded-3xl bg-slate-900 p-10 text-slate-400">Preparing your report…</section> : <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{kpis.map(([label, value, detail]) => <article key={label} className="rounded-3xl border border-white/10 bg-slate-900/80 p-6"><p className="text-xs uppercase tracking-[.18em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-2 text-sm text-slate-500">{detail}</p></article>)}</section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">Top-selling products</h2><p className="mt-1 text-sm text-slate-400">Ranked by net sales after returns.</p><div className="mt-7 space-y-5">{rows.filter(row => row.netRevenue > 0).slice(0, 8).map(row => <div key={row.id}><div className="flex justify-between gap-4 text-sm"><span className="truncate">{row.name}</span><span>{money(row.netRevenue)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${Math.max(3, (row.netRevenue / maxRevenue) * 100)}%` }}/></div></div>)}{!rows.some(row => row.netRevenue > 0) && <p className="text-slate-400">No sales in this period.</p>}</div></article>
        <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">Cash position</h2><div className="mt-6 space-y-4"><Metric label="Sales collected" value={money(rangedSales.reduce((sum, sale) => sum + Number(sale.amount_paid), 0))}/><Metric label="Customer balances" value={money(outstanding)}/><Metric label="Purchases paid" value={money(purchaseTotals.paid)}/><Metric label="Supplier balances" value={money(purchaseTotals.total - purchaseTotals.paid)}/>{financial && <Metric label="Estimated gross profit" value={money(profit)} accent/>}</div></article>
      </section>
      <ReportTable title="Product performance" headers={["Product", "SKU", "Sold", "Returned", "Net sales", ...(financial ? ["Profit"] : []), "In stock"]} rows={rows.slice(0, 20).map(row => [row.name, row.sku, row.sold, row.returned, money(row.netRevenue), ...(financial ? [money(row.profit)] : []), row.stock])}/>
      <section className="grid gap-6 xl:grid-cols-2"><ReportTable title="Customer report" headers={["Customer", "Sales", "Revenue", "Balance"]} rows={customerRows.slice(0, 10).map(row => [row.name, row.count, money(row.total), money(row.balance)])}/><ReportTable title="Supplier report" headers={["Supplier", "Orders", "Purchased", "Balance"]} rows={supplierRows.slice(0, 10).map(row => [row.name, row.count, money(row.total), money(row.balance)])}/></section>
    </>}
  </div></main></AuthGuard>;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="flex items-center justify-between gap-5 rounded-2xl bg-slate-950/70 p-4"><span className="text-slate-400">{label}</span><span className={accent ? "font-semibold text-emerald-300" : "font-semibold"}>{value}</span></div>;
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  return <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">{title}</h2>{rows.length === 0 ? <p className="mt-6 text-slate-400">No matching activity in this period.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-400"><tr>{headers.map(header => <th key={header} className="px-3 py-3 font-medium">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="px-3 py-3">{cell}</td>)}</tr>)}</tbody></table></div>}</section>;
}
