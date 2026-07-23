"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import type { Sale } from "@/lib/types";

export default function SalesPage(){
  const [sales,setSales]=useState<Sale[]>([]);const [search,setSearch]=useState("");const [status,setStatus]=useState("");const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  useEffect(()=>{void supabase.from("sales").select("id,receipt_number,customer_id,subtotal,discount_amount,tax_amount,total_amount,amount_paid,payment_method,payment_status,notes,sold_by,created_at,customers(name)").order("created_at",{ascending:false}).then(({data,error:queryError})=>{setSales((data??[]) as unknown as Sale[]);setError(queryError?.message??"");setLoading(false);});},[]);
  const shown=useMemo(()=>sales.filter(s=>(!status||s.payment_status===status)&&(!search||`${s.receipt_number} ${s.customers?.name??""}`.toLowerCase().includes(search.toLowerCase()))),[sales,status,search]);
  return <AuthGuard><main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-12"><div className="mx-auto max-w-7xl space-y-8"><AppNav/>
    <header className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm uppercase tracking-[.3em] text-emerald-300">Sales ledger</p><h1 className="mt-3 text-3xl font-semibold">Sales and receipts</h1></div><Link href="/sales/new" className="rounded-full bg-emerald-500 px-6 py-3 text-center font-semibold text-slate-950">Record sale</Link></header>
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><div className="grid gap-3 sm:grid-cols-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search receipt or customer…" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="">All payment statuses</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="unpaid">Unpaid</option></select></div>
      {loading?<p className="mt-8 text-slate-400">Loading sales…</p>:error?<p className="mt-8 text-rose-300">{error}</p>:shown.length===0?<p className="mt-8 text-center text-slate-400">No sales recorded yet.</p>:<div className="mt-7 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-400"><tr>{["Receipt","Customer","Total","Paid","Method","Status","Date",""].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{shown.map(s=><tr key={s.id}><td className="px-4 py-4 font-semibold">{s.receipt_number}</td><td className="px-4">{s.customers?.name??"Walk-in"}</td><td className="px-4">{Number(s.total_amount).toLocaleString()}</td><td className="px-4">{Number(s.amount_paid).toLocaleString()}</td><td className="px-4 capitalize">{s.payment_method}</td><td className="px-4 capitalize">{s.payment_status}</td><td className="px-4">{new Date(s.created_at).toLocaleString()}</td><td className="px-4"><Link href={`/sales/${s.id}`} className="text-emerald-300">Receipt</Link></td></tr>)}</tbody></table></div>}
    </section>
  </div></main></AuthGuard>;
}
