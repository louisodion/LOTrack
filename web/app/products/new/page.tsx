"use client";

import { useRouter } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import ProductForm, { type ProductValues } from "@/app/components/ProductForm";
import { supabase } from "@/lib/supabaseClient";
import { getWorkspaceScope } from "@/lib/workspace";

export default function NewProductPage() {
  const router = useRouter();
  const save = async (values: ProductValues) => {
    const scope = await getWorkspaceScope();
    if (!scope.userId || !scope.workspaceId) return { error: "Please sign in again." };
    const payload = {
      ...values, category_id: values.category_id || null, description: values.description || null,
      supplier: values.supplier || null, image_url: values.image_url || null,
      expiry_date: values.expiry_date || null, barcode: values.barcode || null,
      overstock_threshold: values.overstock_threshold || null, price: values.selling_price,
      user_id: scope.userId, workspace_id: scope.workspaceId,
    };
    const { error } = await supabase.from("products").insert(payload);
    if (!error) router.push("/products");
    return { error: error?.message ?? null };
  };
  return <AuthGuard><main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12">
    <div className="mx-auto max-w-4xl space-y-8"><AppNav/><section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
      <p className="text-sm uppercase tracking-[.3em] text-emerald-300">New product</p><h1 className="mt-3 text-3xl font-semibold">Add a catalog item</h1>
      <ProductForm onSave={save} submitLabel="Create product"/>
    </section></div>
  </main></AuthGuard>;
}
