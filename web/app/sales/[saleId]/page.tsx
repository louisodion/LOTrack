"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import type { Sale, SaleItem } from "@/lib/types";

export default function ReceiptPage(){
  const params=useParams();const id=Array.isArray(params.saleId)?params.saleId[0]:params.saleId;
  const [sale,setSale]=useState<Sale|null>(null);const [items,setItems]=useState<SaleItem[]>([]);const [message,setMessage]=useState("");const [returning,setReturning]=useState<string|null>(null);
  const load=async()=>{const [saleResult,itemResult]=await Promise.all([supabase.from("sales").select("id,receipt_number,customer_id,subtotal,discount_amount,tax_amount,total_amount,amount_paid,payment_method,payment_status,notes,sold_by,created_at,customers(name)").eq("id",id).single(),supabase.from("sale_items").select("*").eq("sale_id",id).order("created_at")]);setSale(saleResult.data as unknown as Sale);setItems((itemResult.data??[]) as SaleItem[]);setMessage(saleResult.error?.message??itemResult.error?.message??"");};
  useEffect(()=>{void Promise.resolve().then(load);},[id]);
  const processReturn=async(item:SaleItem)=>{const available=item.quantity-item.returned_quantity;const answer=window.prompt(`Quantity to return (maximum ${available})`,"1");if(!answer)return;const quantity=Number(answer);const reason=window.prompt("Reason for return (optional)","Customer return")??"";setReturning(item.id);const {error}=await supabase.rpc("return_sale_item",{p_sale_item_id:item.id,p_quantity:quantity,p_reason:reason||null});setReturning(null);setMessage(error?.message??"Return processed and stock restored.");if(!error)await load();};
  if(!sale)return <AuthGuard><main className="grid min-h-screen place-items-center bg-slate-950 text-slate-400">{message||"Loading receipt…"}</main></AuthGuard>;
  return <AuthGuard><main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-12"><div className="mx-auto max-w-5xl space-y-8 print:max-w-none"><div className="print:hidden"><AppNav/></div>
    {message&&<p className="print:hidden rounded-2xl bg-amber-400/10 p-4 text-amber-200">{message}</p>}
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 print:border-0 print:bg-white print:text-black"><div className="flex flex-col gap-5 border-b border-slate-700 pb-7 sm:flex-row sm:justify-between"><div><p className="text-sm uppercase tracking-[.3em] text-emerald-300">LOTrack receipt</p><h1 className="mt-3 text-3xl font-semibold">{sale.receipt_number}</h1><p className="mt-2 text-slate-400">{new Date(sale.created_at).toLocaleString()}</p></div><div className="sm:text-right"><p className="font-semibold">{sale.customers?.name??"Walk-in customer"}</p><p className="capitalize text-slate-400">{sale.payment_method} · {sale.payment_status}</p></div></div>
      <div className="mt-7 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-400"><tr>{["Product","Qty","Unit price","Discount","Total","Returned",""].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{items.map(item=><tr key={item.id}><td className="px-4 py-4"><p className="font-semibold">{item.product_name}</p><p className="text-xs text-slate-400">{item.sku}</p></td><td className="px-4">{item.quantity}</td><td className="px-4">{Number(item.unit_price).toLocaleString()}</td><td className="px-4">{Number(item.discount_amount).toLocaleString()}</td><td className="px-4">{Number(item.line_total).toLocaleString()}</td><td className="px-4">{item.returned_quantity}</td><td className="px-4 print:hidden">{item.returned_quantity<item.quantity&&<button disabled={returning===item.id} onClick={()=>processReturn(item)} className="text-amber-300">Return</button>}</td></tr>)}</tbody></table></div>
      <div className="ml-auto mt-8 max-w-sm space-y-2 rounded-2xl bg-slate-950/70 p-6 print:bg-slate-100"><div className="flex justify-between"><span>Subtotal</span><span>{Number(sale.subtotal).toLocaleString()}</span></div><div className="flex justify-between"><span>Discount</span><span>-{Number(sale.discount_amount).toLocaleString()}</span></div><div className="flex justify-between"><span>Tax</span><span>{Number(sale.tax_amount).toLocaleString()}</span></div><div className="flex justify-between border-t border-slate-700 pt-3 text-xl font-semibold"><span>Total</span><span>{Number(sale.total_amount).toLocaleString()}</span></div><div className="flex justify-between text-emerald-300"><span>Paid</span><span>{Number(sale.amount_paid).toLocaleString()}</span></div><div className="flex justify-between text-amber-300"><span>Balance</span><span>{(Number(sale.total_amount)-Number(sale.amount_paid)).toLocaleString()}</span></div></div>
      {sale.notes&&<p className="mt-6 text-sm text-slate-400">Notes: {sale.notes}</p>}
    </section>
    <div className="flex flex-wrap gap-3 print:hidden"><button onClick={()=>window.print()} className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-slate-950">Print receipt</button><Link href="/sales" className="rounded-full bg-slate-800 px-6 py-3">Back to sales</Link></div>
  </div></main></AuthGuard>;
}
