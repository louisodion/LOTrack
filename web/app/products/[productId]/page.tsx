"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import ProductForm, { type ProductValues } from "@/app/components/ProductForm";
import { supabase } from "@/lib/supabaseClient";

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [initial, setInitial] = useState<Partial<ProductValues> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void supabase.from("products").select("*").eq("id", id).single().then(({ data, error: loadError }) => {
      if (loadError) return setError(loadError.message);
      setInitial({
        name: data.name, sku: data.sku, category_id: data.category_id, description: data.description ?? "",
        quantity: Number(data.quantity), cost_price: Number(data.cost_price), selling_price: Number(data.selling_price),
        reorder_threshold: Number(data.reorder_threshold), overstock_threshold: data.overstock_threshold,
        supplier: data.supplier ?? "", image_url: data.image_url ?? "", unit: data.unit ?? "unit",
        expiry_date: data.expiry_date ?? "", barcode: data.barcode ?? "",
      });
    });
  }, [id]);
  const save = async (values: ProductValues) => {
    const { error: saveError } = await supabase.from("products").update({
      ...values, category_id: values.category_id || null, description: values.description || null,
      supplier: values.supplier || null, image_url: values.image_url || null,
      expiry_date: values.expiry_date || null, barcode: values.barcode || null,
      overstock_threshold: values.overstock_threshold || null, price: values.selling_price,
    }).eq("id", id);
    if (!saveError) router.push("/products");
    return { error: saveError?.message ?? null };
  };
  const remove = async () => {
    if (!window.confirm("Delete this product? Products with movement history cannot be deleted.")) return;
    const { error: deleteError } = await supabase.from("products").delete().eq("id", id);
    if (deleteError) setError(deleteError.message); else router.push("/products");
  };
  return <AuthGuard><main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12">
    <div className="mx-auto max-w-4xl space-y-8"><AppNav/><section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
      <p className="text-sm uppercase tracking-[.3em] text-emerald-300">Edit product</p><h1 className="mt-3 text-3xl font-semibold">Update catalog details</h1>
      {error && <p className="mt-4 text-rose-400">{error}</p>}
      {!initial ? <p className="mt-8 text-slate-400">Loading product…</p> : <><ProductForm initial={initial} onSave={save} submitLabel="Save changes"/>
        <button onClick={remove} className="mt-6 rounded-full bg-rose-500/20 px-5 py-3 text-rose-300">Delete product</button></>}
    </section></div>
  </main></AuthGuard>;
}
