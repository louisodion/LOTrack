"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/app/components/AuthGuard";
import AppNav from "@/app/components/AppNav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { getWorkspaceScope } from "@/lib/workspace";
import { productSchema } from "@/lib/schemas";
import type { z } from "zod";

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      quantity: 0,
      price: 0,
      reorder_threshold: 1,
    },
  });

  const onSubmit = async (values: ProductFormValues) => {
    setLoading(true);
    setSubmitError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setSubmitError("Unable to determine user session. Please sign in again.");
      setLoading(false);
      return;
    }

    const { workspaceId: scopedWorkspaceId } = await getWorkspaceScope();
    const workspace_id = scopedWorkspaceId ?? userId;

    const { error } = await supabase.from("products").insert({
      name: values.name,
      sku: values.sku,
      quantity: values.quantity,
      price: values.price,
      reorder_threshold: values.reorder_threshold,
      user_id: userId,
      workspace_id,
    });

    setLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.push("/products");
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <AppNav />
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">New product</p>
              <h1 className="text-3xl font-semibold text-white">Add a product to inventory.</h1>
              <p className="text-sm leading-6 text-slate-400">Create a product record so LOTrack can begin tracking stock levels and reorder alerts.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Product name</span>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
                {formState.errors.name ? <p className="text-xs text-rose-400">{formState.errors.name.message}</p> : null}
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>SKU</span>
                <input
                  type="text"
                  {...register("sku")}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
                {formState.errors.sku ? <p className="text-xs text-rose-400">{formState.errors.sku.message}</p> : null}
              </label>
              <div className="grid gap-6 sm:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min={0}
                    {...register("quantity", { valueAsNumber: true })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formState.errors.quantity ? <p className="text-xs text-rose-400">{formState.errors.quantity.message}</p> : null}
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Price</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register("price", { valueAsNumber: true })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formState.errors.price ? <p className="text-xs text-rose-400">{formState.errors.price.message}</p> : null}
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Reorder threshold</span>
                  <input
                    type="number"
                    min={1}
                    {...register("reorder_threshold", { valueAsNumber: true })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formState.errors.reorder_threshold ? (
                    <p className="text-xs text-rose-400">{formState.errors.reorder_threshold.message}</p>
                  ) : null}
                </label>
              </div>
              {submitError ? <p className="text-sm text-rose-400">{submitError}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {loading ? "Saving product..." : "Save product"}
                </button>
                <Link href="/products" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                  Back to products
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
