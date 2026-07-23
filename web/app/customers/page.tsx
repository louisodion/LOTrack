"use client";

import { useEffect, useState } from "react";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { getWorkspaceScope } from "@/lib/workspace";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [phone,setPhone]=useState("");
  const [address,setAddress]=useState(""); const [notes,setNotes]=useState(""); const [search,setSearch]=useState(""); const [message,setMessage]=useState("");
  const load=async()=>{const {data,error}=await supabase.from("customers").select("id,name,email,phone,address,notes").order("name");setCustomers((data??[]) as Customer[]);setMessage(error?.message??"");};
  useEffect(()=>{void Promise.resolve().then(load);},[]);
  const create=async()=>{if(name.trim().length<2)return setMessage("Enter a customer name.");const scope=await getWorkspaceScope();if(!scope.userId||!scope.workspaceId)return setMessage("Please sign in again.");const {error:createError}=await supabase.from("customers").insert({name:name.trim(),email:email||null,phone:phone||null,address:address||null,notes:notes||null,workspace_id:scope.workspaceId,created_by:scope.userId});if(createError)return setMessage(createError.message);setName("");setEmail("");setPhone("");setAddress("");setNotes("");setMessage("Customer created.");await load();};
  const remove=async(id:string)=>{if(!window.confirm("Delete this customer? Existing receipts will remain."))return;const {error:removeError}=await supabase.from("customers").delete().eq("id",id);setMessage(removeError?.message??"Customer deleted.");if(!removeError)await load();};
  const shown=customers.filter(c=>`${c.name} ${c.email??""} ${c.phone??""}`.toLowerCase().includes(search.toLowerCase()));
  const input="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3";
  return <AuthGuard><main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-12"><div className="mx-auto max-w-7xl space-y-8"><AppNav/>
    <header className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8"><p className="text-sm uppercase tracking-[.3em] text-emerald-300">Customer records</p><h1 className="mt-3 text-3xl font-semibold">Customers</h1><p className="mt-2 text-slate-400">Keep contact details connected to receipts and credit sales.</p></header>
    {message&&<p className="rounded-2xl bg-amber-400/10 p-4 text-amber-200">{message}</p>}
    <section className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><h2 className="text-xl font-semibold">New customer</h2><div className="mt-5 grid gap-3"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Customer name" className={input}/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email (optional)" className={input}/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone (optional)" className={input}/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Address (optional)" className={input}/><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" className={input}/><button onClick={create} className="rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950">Save customer</button></div></div>
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…" className={`${input} w-full`}/><div className="mt-5 space-y-3">{shown.length===0?<p className="text-slate-400">No customers found.</p>:shown.map(c=><div key={c.id} className="flex items-center justify-between rounded-2xl bg-slate-950/80 p-5"><div><p className="font-semibold">{c.name}</p><p className="text-sm text-slate-400">{c.email||c.phone||"No contact details"}</p></div><button onClick={()=>remove(c.id)} className="text-sm text-rose-300">Delete</button></div>)}</div></div>
    </section>
  </div></main></AuthGuard>;
}
