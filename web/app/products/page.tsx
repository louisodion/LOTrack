"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import type { Category, Product } from "@/lib/types";
import { getWorkspaceScope } from "@/lib/workspace";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [canViewFinancials, setCanViewFinancials] = useState(false);
  useEffect(() => {
    void Promise.all([
      supabase.from("products").select("id,name,sku,category_id,description,quantity,cost_price,selling_price,reorder_threshold,overstock_threshold,supplier,image_url,unit,expiry_date,barcode,categories(name)").order("name"),
      supabase.from("categories").select("id,name,description,workspace_id").order("name"),
      getWorkspaceScope(),
    ]).then(([productResult, categoryResult, scope]) => {
      if (productResult.error) setError(productResult.error.message);
      setProducts((productResult.data ?? []) as unknown as Product[]);
      setCategories((categoryResult.data ?? []) as Category[]);
      const manager = scope.profile?.role === "owner" || scope.profile?.role === "admin" || Boolean(scope.profile?.permissions?.manage_products);
      setCanManage(manager);
      setCanViewFinancials(scope.profile?.role === "owner" || scope.profile?.role === "admin" || Boolean(scope.profile?.permissions?.view_financials));
      setLoading(false);
    });
  }, []);
  const filtered = useMemo(() => products.filter((product) =>
    (!category || product.category_id === category) &&
    (!search || `${product.name} ${product.sku} ${product.barcode ?? ""}`.toLowerCase().includes(search.toLowerCase()))
  ), [products, category, search]);
  return <AuthGuard><main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12">
    <div className="mx-auto max-w-7xl space-y-8"><AppNav/>
      <header className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm uppercase tracking-[.3em] text-emerald-300">Product catalog</p><h1 className="mt-3 text-3xl font-semibold">Manage your inventory</h1></div>
        {canManage&&<div className="flex flex-wrap gap-3"><Link href="/categories" className="rounded-full bg-slate-800 px-5 py-3 font-semibold text-emerald-300">Manage categories</Link><Link href="/products/new" className="rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950">Add product</Link></div>}
      </header>
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, SKU, or barcode…" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/>
          <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        {loading ? <p className="mt-8 text-slate-400">Loading products…</p> : error ? <p className="mt-8 text-rose-400">{error}</p> : filtered.length === 0 ? <p className="mt-8 text-center text-slate-400">No products match these filters.</p> :
          <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10"><table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400"><tr>{["Product","Category","Stock",...(canViewFinancials?["Cost","Selling"]:[]),"Supplier","Status",...(canManage?[""]:[])].map(h => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-800">{filtered.map(p => <tr key={p.id}>
              <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.sku} · {p.unit}</p></td>
              <td className="px-5 py-4">{p.categories?.name ?? "Uncategorized"}</td><td className="px-5 py-4">{p.quantity}</td>
              {canViewFinancials&&<><td className="px-5 py-4">{Number(p.cost_price).toLocaleString()}</td><td className="px-5 py-4">{Number(p.selling_price).toLocaleString()}</td></>}
              <td className="px-5 py-4">{p.supplier ?? "—"}</td>
              <td className="px-5 py-4"><span className={p.quantity === 0 ? "text-rose-300" : p.quantity <= p.reorder_threshold ? "text-amber-300" : "text-emerald-300"}>{p.quantity === 0 ? "Out of stock" : p.quantity <= p.reorder_threshold ? "Low stock" : "In stock"}</span></td>
              {canManage&&<td className="px-5 py-4"><Link href={`/products/${p.id}`} className="text-emerald-300">Edit</Link></td>}
            </tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  </main></AuthGuard>;
}
